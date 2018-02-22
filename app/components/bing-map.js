/* global Microsoft */
import config from '../config/environment';
import Component from '@ember/component';
import computed from 'ember-macro-helpers/computed';
import { get, getProperties } from '@ember/object';

export default Component.extend({
  classNames: ['bing-map'],
  pins: null,
  map: null,
  options: {},
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

  init() {
    this._super();
    if (!config.bingAPIKey) {
      throw('Missing bingAPIKey from config/environment');
    }
    this.set('defaultOpts.credentials', config.bingAPIKey);
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

  updateCenter: function () {
    let {
      map,
      mapOptions,
      locations,
    } = getProperties(this, 'map', 'mapOptions', 'locations');

    if (map) {
      let { center, bounds, zoom, padding } = mapOptions;
      map.setView({ center, bounds, zoom, padding });
      map.entities.clear();
      locations.forEach((location) => {
        console.log(location.options);
        return map.entities.push( new Microsoft.Maps.Pushpin(location.loc, location.options))
      });
    }
  },

  locations: computed('pins', (pins) => {
    return (pins || []).map(pin => {
      return { loc: new Microsoft.Maps.Location(pin.lat, pin.long), options: pin.options }
    });
  }),

  centerBounds: computed('locations', (locations) => {
    let bounds = Microsoft.Maps.LocationRect.fromLocations(locations.map(l => l.loc));
    return bounds;
  }),

  mapOptions: computed('options', 'defaultOpts', 'locations', 'centerBounds', (options, defaultOpts, locations, centerBounds) => {
    let mapOpts = Object.assign(defaultOpts, options);
    if (locations.length > 1) {
      mapOpts.bounds = centerBounds;
      delete mapOpts.zoom;
      delete mapOpts.center;
    } else {
      mapOpts.center = centerBounds.center;
      delete mapOpts.bounds;
    }
    return mapOpts;
  }),

  createMap: function() {
    let el = this.$()[0];
    let opts = get(this, 'mapOptions');

    console.log(opts);
    this.set('map', new Microsoft.Maps.Map(el, opts));
    this.updateCenter();
  },

  removeMap: function() {
    this.map.dispose();
  }
});


