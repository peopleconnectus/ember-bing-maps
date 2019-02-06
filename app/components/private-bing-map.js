import config from '../config/environment';
import Component from '@ember/component';
import { computed } from 'ember-awesome-macros';
import { get, getWithDefault, getProperties } from '@ember/object';
import RSVP from 'rsvp';

export default Component.extend({
  Microsoft: null,
  classNames: ['bing-map'],
  pins: null,
  map: null,
  options: {},
  handlers: [],
  infoBox: null,
  defaultOpts: {
    birdseyeFallback: {
      type: 'aerial',
      zoom: 15,
      navBarMode: 'minified',
      navBarOrientation: 'vertical',
    },
    defaultCenter: { location: { latitude: '45.0', longitude: '-100.0' }, width: 20, height: 28 },
    // Note: this does nothing for minified/compact menu view in birdseye...
    // allowHidingLabelsOfRoad: false,
    enableClickableLogo: false,
    // Note: vertical + minified + birdseye = NO MENU...
    // Please also note birdseyeFallback in case birdseye is not available
    mapType: 'road',
    mapTypeHover: false,
    // also note that minified is not supported for birdseye - Dafuck bing, serz?
    // this means if you start in birdseye, exit to aerial you cant get back in too...fun
    navBarMode: 'minified',
    navBarOrientation: 'vertical',
    padding: 20,
    showMapTypeSelector: true,
    showTrafficButton: false,
    // Note; bing ignores this unless its adding MORE types like the canvasDark et al...
    supportedMapTypes: [
      'road',
      'aerial',
      'streetside',
      'birdseye'
    ],
    zoom: 10
  },
  eventHandlers: {
    pin: {
      //'click': (e, infoBox, map) => {},
      //'mousedown': (e, infoBox, map) => {},
      // ...
    }
  },

  init() {
    this._super();
    let apiKey = getWithDefault(config, 'ember-bing-maps', {}).apiKey;
    if (!apiKey) {
      throw ('Missing bingAPIKey from config/environment');
    }
    this.set('defaultOpts.credentials', apiKey);
  },

  didInsertElement() {
    this.createMap();
  },

  didReceiveAttrs() {
    this.updateCenter();
  },

  willDestroyElement() {
    this.removeMap();
  },

  createMap: function () {
    let Microsoft = get(this, 'Microsoft');
    let el = get(this, 'element');
    let opts = get(this, 'mapOptions');

    this.getMapTypeId(opts).then(options => {
      let map = new Microsoft.Maps.Map(el, options);


      this.set('map', map);
      this.updateCenter();
    })
  },

  clearEntities: function () {
    let Microsoft = get(this, 'Microsoft');

    // Clear handlers
    let handlers = get(this, 'handlers');
    (handlers || []).forEach(Microsoft.Maps.Events.removeHandler);
    this.set('handlers', []);

    // Clear infoBoxes
    let infoBoxes = get(this, 'currentInfoBoxes');
    (infoBoxes || []).forEach((ib) => ib.setMap(null));
    this.set('currentInfoBoxes', []);

    // Clear pins
    let map = get(this, 'map');
    if (map) {
      map.entities.clear();
    }
  },

  // Useful for things like on-click re-center map, pop dialog box, others..
  updateCenter: function () {
    let {
      map,
      mapOptions
    } = getProperties(this, 'map', 'mapOptions');

    if (map) {
      let { center, bounds, zoom, padding } = mapOptions;
      map.setView({ center, bounds, zoom, padding });
      this.clearEntities();
      this.addPins(map);
      this.addInfoBoxes(map);
    }
  },

  addPins: function (map) {
    let Microsoft = get(this, 'Microsoft');
    let locations = getWithDefault(this, 'locations', []);
    locations.forEach((location) => {
      let pin = new Microsoft.Maps.Pushpin(location.loc, location.options);
      pin.metadata = location.options.metadata || {};
      map.entities.push(pin);
      this.addPinEvents(pin);
    });
  },

  addPinEvents: function (pin) {
    let {
      handlers,
      eventHandlers = {}
    } = getProperties(this, 'handlers', 'eventHandlers');
    let pinEvents = getWithDefault(eventHandlers, 'pin', {});
    let Microsoft = get(this, 'Microsoft');

    Object.keys(pinEvents).map((eventName) => {
      handlers.push(Microsoft.Maps.Events.addHandler(
        pin,
        eventName,
        (e) => pinEvents[eventName](e, this),
      ));
    });
  },

  addInfoBoxes: function (map) {
    let Microsoft = get(this, 'Microsoft');
    let infoBoxes = getWithDefault(this, 'infoBoxes', []);
    let currentInfoBoxes = getWithDefault(this, 'currentInfoBoxes', []);
    infoBoxes.forEach(({ location, options = {} }) => {
        if (options.point) {
          options.point = new Microsoft.Maps.Point(options.point.x, options.point.y);
        }
        let infoBox = new Microsoft.Maps.Infobox(new Microsoft.Maps.Location(location.latitude, location.longitude), options);
        infoBox.setMap(map);
        currentInfoBoxes.push(infoBox);
    });
    this.set('currentInfoBoxes', currentInfoBoxes);
  },

  removeMap: function () {
    this.clearEntities();
    let map = get(this, 'map');
    if (map) {
      map.dispose();
    }
  },

  locations: computed('pins', function (pins) {
    let Microsoft = get(this, 'Microsoft');

    return (pins || []).map(({ latitude, longitude, options = {} }) => {
      if (latitude && longitude) {
        return { loc: new Microsoft.Maps.Location(latitude, longitude), options }
      }
      return false;
    }).filter(Boolean);
  }),

  centerBounds: computed('locations', function(locations) {
    let Microsoft = get(this, 'Microsoft');
    let bounds;

    if (locations.length) {
      bounds = Microsoft.Maps.LocationRect.fromLocations(locations.map(l => l.loc));
    }
    return bounds;
  }),

  setCenterBasedOnLocations: function (opts, locations) {
    let centerBounds = get(this, 'centerBounds');

    if (locations.length > 1) {
      opts.bounds = centerBounds;
    } else if (centerBounds) {
      opts.center = centerBounds.center;
    }

    // WTF bing why do you do this to me?
    if (opts.center) {
      delete opts.bounds;
    }
    if (opts.bounds) {
      delete opts.center;
      delete opts.zoom;
    }
  },

  mapOptions: computed('options', 'defaultOpts', 'locations', function(options, defaultOpts, locations) {
    let Microsoft = get(this, 'Microsoft');
    let opts = Object.assign({}, defaultOpts, options);

    // Microsoft-ize em all here -- these need documentation
    opts.bounds = new Microsoft.Maps.LocationRect(opts.defaultCenter.location, opts.defaultCenter.width, opts.defaultCenter.height);
    opts.supportedMapTypes = opts.supportedMapTypes.map(mType => Microsoft.Maps.MapTypeId[mType] || mType);
    opts.navigationBarMode = Microsoft.Maps.NavigationBarMode[opts.navBarMode];
    opts.navigationBarOrientation = Microsoft.Maps.NavigationBarOrientation[opts.navBarOrientation];
    opts.disableMapTypeSelectorMouseOver = !opts.mapTypeHover

    this.setCenterBasedOnLocations(opts, locations);

    return opts;
  }),

  getMapTypeId: function(options) {
    let Microsoft = get(this, 'Microsoft');
    options.mapTypeId = Microsoft.Maps.MapTypeId[options.mapType];
    if (options.mapTypeId === Microsoft.Maps.MapTypeId.birdseye) {
      return this.checkBirdseye().then((isAvail) => {
        if (!isAvail) {
          let config = options.birdseyeFallback;
          options.mapTypeId = Microsoft.Maps.MapTypeId[config.type];
          options.zoom = config.zoom;
          options.navigationBarMode = Microsoft.Maps.NavigationBarMode[config.navBarMode];
          options.navigationBarOrientation = Microsoft.Maps.NavigationBarOrientation[config.navBarOrientation];
        }
        return options;
      });
    }
    return RSVP.resolve(options);
  },

  checkBirdseye: function() {
    let Microsoft = get(this, 'Microsoft');
    let location = get(this, 'centerBounds.center');
    let deferred = RSVP.defer();

    if (!location) {
      deferred.resolve(false);
    } else {
      Microsoft.Maps.getIsBirdseyeAvailable(location, Microsoft.Maps.Heading.north, (isAvailable) => {
        if (!isAvailable) {
          deferred.resolve(false);
        }
        deferred.resolve(true);
      });
    }
    return deferred.promise;
  }


});
