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

  createMap: function() {
    let el = this.$()[0];
    let opts = get(this, 'mapOptions');

    this.set('map', new Microsoft.Maps.Map(el, opts));
    this.updateCenter();

  },

  updateCenter: function () {
    let {
      map,
      mapOptions,
      locations,
      onPinClick,
      onPinMouseDown,
      onPinMouseOver,
      onPinMouseOut,
      onPinMouseUp
    } = getProperties(this, 'map', 'mapOptions', 'locations', 'onPinClick',
      'onPinMouseDown', 'onPinMouseOver', 'onPinMouseOut', 'onPinMouseUp'
    );

    if (map) {
      let { center, bounds, zoom, padding } = mapOptions;
      map.setView({ center, bounds, zoom, padding });
      let infobox = new Microsoft.Maps.Infobox(map.getCenter(), {
        visible: false
      });
      infobox.setMap(map);
      map.entities.clear();
      locations.forEach((location) => {
        let pin = new Microsoft.Maps.Pushpin(location.loc, location.options);
        pin.metadata = (location.options || {}).metadata || {};
        map.entities.push(pin)
        Microsoft.Maps.Events.addHandler(pin, 'click', (e) => onPinClick(e, infobox, map));
        Microsoft.Maps.Events.addHandler(pin, 'mousedown', (e) => onPinMouseDown(e, infobox, map));
        Microsoft.Maps.Events.addHandler(pin, 'mouseout', (e) => onPinMouseOut(e, infobox, map));
        Microsoft.Maps.Events.addHandler(pin, 'mouseover', (e) => onPinMouseOver(e, infobox, map));
        Microsoft.Maps.Events.addHandler(pin, 'mouseup', (e) => onPinMouseUp(e, infobox, map));
      });
    }
  },

  removeMap: function() {
    this.map.dispose();
  },

  locations: computed('pins', (pins) => {
    return (pins || []).map( ({ latitude, longitude, options }) => {
      return { loc: new Microsoft.Maps.Location(latitude, longitude), options}
    });
  }),

  centerBounds: computed('locations', (locations) => {
    let bounds = Microsoft.Maps.LocationRect.fromLocations(locations.map(l => l.loc));
    return bounds;
  }),

  mapOptions: computed('options', 'defaultOpts', 'locations', 'centerBounds', (options, defaultOpts, locations, centerBounds) => {
    let mapOpts = Object.assign({}, defaultOpts, options);
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

  onPinClick: function() {
    // noop
  },
  onPinMouseDown: function() {
    // noop
  },
  onPinMouseOver: function() {
    // noop
  },
  onPinMouseUp: function() {
    // noop
  },
  onPinMouseOut: function() {
    // noop
  }
});


