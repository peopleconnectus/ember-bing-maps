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
  didInitialize: false,
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
    try {
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
      this.set('didInitialize', true);
    } catch(e) {
      // eslint-disable-line no-console
      console.log('There was an error: ', e);
    }
  },

  didInsertElement() {
    if (this.get('didInitialize')) {
      this.createMap();
    }
  },

  didReceiveAttrs() {
    if (this.get('didInitialize')) {
      this.updateCenter();
    }
  },

  willDestroyElement() {
    if (this.get('didInitialize')) {
      this.removeMap();
    }
  },

  addCustomInfoBoxes: function(map, customInfoBoxes) {
    customInfoBoxes = (customInfoBoxes || []).map(({ infoBoxTemplate, description, location }) => {
      if (infoBoxTemplate && description && location) {
        return {
          content: new Microsoft.Maps.Infobox(new Microsoft.Maps.Location(location.latitude, location.longitude), {
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

  createMap: function() {
    let el = get(this, 'element');
    let opts = get(this, 'mapOptions');
    let map = new Microsoft.Maps.Map(el, opts);

    let infoBox = new Microsoft.Maps.Infobox(map.getCenter(), {
      visible: false
    });

    this.set('infoBox', infoBox);

    let customInfoBoxes = get(this, 'infoBoxes');
    if(customInfoBoxes){
      this.addCustomInfoBoxes(map, customInfoBoxes);
    }
    this.set('map', map);
    this.updateCenter();
  },

  clearEntities: function() {
    let map = get(this, 'map');
    let handlers = get(this, 'handlers');
    (handlers || []).forEach( Microsoft.Maps.Events.removeHandler );
    this.set('handlers', []);
    if (map) {
      map.entities.clear();
    }
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
      this.clearEntities();
      locations.forEach((location) => {
        let pin = new Microsoft.Maps.Pushpin(location.loc, location.options);
        pin.metadata = (location.options || {}).metadata || {};
        map.entities.push(pin);
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
