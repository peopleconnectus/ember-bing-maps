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
    zoom: 10,
    padding: 20,
    birdseyeFallback: {
      type: 'aerial',
      zoom: 15,
      navBarMode: 'minified',
      navBarOrientation: 'vertical',
    },
    defaultCenter: { location: { latitude: '45.0', longitude: '-100.0' }, width: 20, height: 28 },
    enableClickableLogo: false,
    showMapTypeSelector: true,
    showTrafficButton: false,
    // Note: this does nothing for minified/compact menu view in birdseye...
    // allowHidingLabelsOfRoad: false,
    disableMapTypeSelectorMouseOver: true,
    // Note; bing ignores this unless its adding MORE types like the canvasDark et al...
    supportedMapTypes: [
      //'road',
      //'aerial',
      //'streetside',
      'birdseye'
    ],
    // Note: vertical + minified + birdseye = NO MENU...
    // Please also note birdseyeFallback in case birdseye is not available
    mapType: 'road',
    // also note that minified is not supported for birdseye - Dafuck bing, serz?
    // this means if you start in birdseye, exit to aerial you cant get back in too...fun
    navBarMode: 'minified',
    navBarOrientation: 'vertical',
  },
  events: {
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

  addCustomInfoBoxes: function (map, customInfoBoxes) {
    customInfoBoxes = (customInfoBoxes || []).map(({ infoBoxTemplate, description, location }) => {
      if (infoBoxTemplate && description && location) {
        return {
          content: new this.Microsoft.Maps.Infobox(new this.Microsoft.Maps.Location(location.latitude, location.longitude), {
            htmlContent: infoBoxTemplate.replace('{description}', description)
          })
        }
      }
      return false;
    }).filter(Boolean);
    customInfoBoxes.forEach((customInfoBox) => {
      customInfoBox.content.setMap(map);
    });
  },

  createMap: function () {
    let Microsoft = this.get('Microsoft');
    let el = get(this, 'element');
    let opts = get(this, 'mapOptions');

    this.getMapTypeId(opts).then(options => {
      let map = new Microsoft.Maps.Map(el, options);

      let infoBox = new Microsoft.Maps.Infobox(map.getCenter(), {
        visible: false
      });

      this.set('infoBox', infoBox);

      let customInfoBoxes = get(this, 'infoBoxes');
      if (customInfoBoxes) {
        this.addCustomInfoBoxes(map, customInfoBoxes);
      }

      this.set('map', map);
      this.updateCenter();
    })
  },

  clearEntities: function () {
    let map = get(this, 'map');
    let handlers = get(this, 'handlers');
    let Microsoft = this.get('Microsoft');
    (handlers || []).forEach(Microsoft.Maps.Events.removeHandler);
    this.set('handlers', []);
    if (map) {
      map.entities.clear();
    }
  },

  // Useful for things like on-click re-center map, pop dialog box, others..
  addPinEvents: function (pin) {
    let {
      handlers,
      events,
      infoBox,
      map
    } = getProperties(this, 'handlers', 'events', 'infoBox', 'map');
    let pinEvents = getWithDefault(events, 'pin', {});
    let Microsoft = this.get('Microsoft');

    Object.keys(pinEvents).map((eventName) => {
      handlers.push(Microsoft.Maps.Events.addHandler(
        pin,
        eventName,
        (e) => pinEvents[eventName](e, infoBox, map)
      ));
    });
  },

  updateCenter: function () {
    let {
      map,
      mapOptions,
      locations
    } = getProperties(this, 'map', 'mapOptions', 'locations');
    let Microsoft = this.get('Microsoft');

    if (map) {
      let { center, bounds, zoom, padding } = mapOptions;
      map.setView({ center, bounds, zoom, padding });
      this.clearEntities();
      locations.forEach((location) => {
        let pin = new Microsoft.Maps.Pushpin(location.loc, location.options);
        pin.metadata = (location.options || {}).metadata || {};
        map.entities.push(pin);
        this.addPinEvents(pin);
      });
    }
  },

  removeMap: function () {
    this.clearEntities();
    let map = this.get('map');
    if (map) {
      map.dispose();
    }
  },

  locations: computed('pins', function (pins) {
    let Microsoft = this.get('Microsoft');

    return (pins || []).map(({ latitude, longitude, options }) => {
      if (latitude && longitude) {
        return { loc: new Microsoft.Maps.Location(latitude, longitude), options }
      }
      return false;
    }).filter(Boolean);
  }),

  centerBounds: computed('locations', function(locations) {
    let bounds;
    let Microsoft = this.get('Microsoft');

    if (locations.length) {
      bounds = Microsoft.Maps.LocationRect.fromLocations(locations.map(l => l.loc));
    }
    return bounds;
  }),

  setCenterBasedOnLocations: function (opts, locations) {
    let centerBounds = this.get('centerBounds');

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
    let opts = Object.assign({}, defaultOpts, options);
    let Microsoft = this.get('Microsoft');

    // Microsoft-ize em all here -- these need documentation
    opts.bounds = new Microsoft.Maps.LocationRect(opts.defaultCenter.location, opts.defaultCenter.width, opts.defaultCenter.height);
    opts.supportedMapTypes = opts.supportedMapTypes.map(mType => Microsoft.Maps.MapTypeId[mType] || mType);
    opts.navigationBarMode = Microsoft.Maps.NavigationBarMode[opts.navBarMode];
    opts.navigationBarOrientation = Microsoft.Maps.NavigationBarOrientation[opts.navBarOrientation];

    this.setCenterBasedOnLocations(opts, locations);

    return opts;
  }),

  getMapTypeId: function(options) {
    let Microsoft = this.get('Microsoft');
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
    let location = this.get('centerBounds.center');
    let deferred = RSVP.defer();
    let Microsoft = this.get('Microsoft');

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
