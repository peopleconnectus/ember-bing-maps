/* global Microsoft */
import config from '../config/environment';
import Component from '@ember/component';
import computed from 'ember-macro-helpers/computed';
import { get, getWithDefault, getProperties } from '@ember/object';

export default Component.extend({
  classNames: ['bing-map'],
  pins: null,
  map: null,
  options: {},
  handlers: [],
  infoBox: null,
  defaultOpts: {
    zoom: 10,
    padding: 20,
    mapTypeId: Microsoft.Maps.MapTypeId.road,
    enableClickableLogo: false,
    supportedMapTypes: [
      Microsoft.Maps.MapTypeId.road,
      Microsoft.Maps.MapTypeId.aerial,
      Microsoft.Maps.MapTypeId.birdseye
    ],
    showMapTypeSelector: true,
    disableMapTypeSelectorMouseOver: true,
    // Note the minified navigation bar ignores 'supportedMapTypes'
    navigationBarMode: Microsoft.Maps.NavigationBarMode.minified
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
      throw('Missing bingAPIKey from config/environment');
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

  createMap: function() {
    let el = this.$()[0];
    let opts = get(this, 'mapOptions');

    let map = new Microsoft.Maps.Map(el, opts);
    let infoBox = new Microsoft.Maps.Infobox(map.getCenter(), {
      visible: false
    });
    infoBox.setMap(map);
    this.set('map', map);
    this.set('infoBox', infoBox);
    this.updateCenter();
  },

  clearEntities: function(map) {
    let handlers = get(this, 'handlers');
    (handlers || []).forEach(  Microsoft.Maps.Events.removeHandler );
    this.set('handlers', []);
    map.entities.clear();
  },

  addPinEvents: function(pin) {
    let {
      handlers,
      events,
      infoBox,
      map
    } = getProperties(this, 'handlers', 'events', 'infoBox', 'map');
    let pinEvents = getWithDefault(events, 'pin', {});

    Object.keys(pinEvents).map( (eventName) => {
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

    if (map) {
      let { center, bounds, zoom, padding } = mapOptions;
      map.setView({ center, bounds, zoom, padding });
      this.clearEntities(map);
      locations.forEach((location) => {
        let pin = new Microsoft.Maps.Pushpin(location.loc, location.options);
        pin.metadata = (location.options || {}).metadata || {};
        map.entities.push(pin)
        this.addPinEvents(pin);
      });
    }
  },

  removeMap: function() {
    this.clearEntities();
    this.map.dispose();
  },

  locations: computed('pins', (pins) => {
    return (pins || []).map( ({ latitude, longitude, options }) => {
      if (latitude && longitude) {
        return { loc: new Microsoft.Maps.Location(latitude, longitude), options}
      }
      return false;
    }).filter(Boolean);
  }),

  centerBounds: computed('locations', (locations) => {
    let bounds;
    if (locations.length) {
      bounds = Microsoft.Maps.LocationRect.fromLocations(locations.map(l => l.loc));
    }
    return bounds;
  }),

  mapOptions: computed('options', 'defaultOpts', 'locations', 'centerBounds', (options, defaultOpts, locations, centerBounds) => {
    let mapOpts = Object.assign({}, defaultOpts, options);
    if (locations.length > 1) {
      mapOpts.bounds = centerBounds;
      delete mapOpts.zoom;
      delete mapOpts.center;
    } else if (centerBounds) {
      mapOpts.center = centerBounds.center;
      delete mapOpts.bounds;
    }
    return mapOpts;
  }),
});


