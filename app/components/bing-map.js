/* global Microsoft */
import config from '../config/environment';
import Component from '@ember/component';
import { computed } from 'ember-awesome-macros';
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
    enableClickableLogo: false,
    showMapTypeSelector: true,
    disableMapTypeSelectorMouseOver: true
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
    if (typeof Microsoft !== 'undefined') {
      let defaultOpts = this.get('defaultOpts');
      this.set('defaultOpts', Object.assign(defaultOpts,
        {
          // Note the minified navigation bar ignores 'supportedMapTypes'
          supportedMapTypes: [
            Microsoft.Maps.MapTypeId.road,
            Microsoft.Maps.MapTypeId.aerial,
            Microsoft.Maps.MapTypeId.birdseye
          ],
          mapTypeId: Microsoft.Maps.MapTypeId.road,
          navigationBarMode: Microsoft.Maps.NavigationBarMode.minified
        })
      );
    }
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
    if (typeof Microsoft === 'undefined') {
      return;
    }

    let el = get(this, 'element');
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

  clearEntities: function() {
    if (typeof Microsoft === 'undefined') {
      return;
    }
    let map = get(this, 'map');
    let handlers = get(this, 'handlers');
    (handlers || []).forEach( Microsoft.Maps.Events.removeHandler );
    this.set('handlers', []);
    if (map) {
      map.entities.clear();
    }
  },

  addPinEvents: function(pin) {
    if (typeof Microsoft === 'undefined') {
      return;
    }
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
    if (typeof Microsoft === 'undefined') {
      return;
    }
    let {
      map,
      mapOptions,
      locations
    } = getProperties(this, 'map', 'mapOptions', 'locations');

    if (map) {
      let { center, bounds, zoom, padding } = mapOptions;
      map.setView({ center, bounds, zoom, padding });
      this.clearEntities();
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
    let map = this.get('map');
    if (map) {
      map.dispose();
    }
  },

  locations: computed('pins', (pins) => {
    if (typeof Microsoft === 'undefined') {
      return [];
    }
    return (pins || []).map( ({ latitude, longitude, options }) => {
      if (latitude && longitude) {
        return { loc: new Microsoft.Maps.Location(latitude, longitude), options}
      }
      return false;
    }).filter(Boolean);
  }),

  centerBounds: computed('locations', (locations) => {
    if (typeof Microsoft === 'undefined') {
      return {};
    }
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
