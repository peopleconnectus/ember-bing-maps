/* global Microsoft */
import Service from '@ember/service';
import Ember from 'ember';

export default Service.extend({
  init() {
    let src, $meta = Ember.$('meta[name="ember-bing-map-sdk-url"]');
    if ($meta.length) {
      src = $meta.attr('content');
      $meta.remove();
      this.set('promise', new Ember.RSVP.Promise(function (resolve, reject) {
        window.__emberBingMapLoaded__ = Ember.run.bind(function () {
          // window.__emberBingMapLoaded__ = null;
          resolve(Microsoft);
        });
        Ember.$.getScript(src + '?callback=__emberBingMapLoaded__').fail(function (jqXhr) {
          // window.__emberBingMapLoaded__ = null;
          reject(jqXhr);
        });
      }));
    }
  },
  promise: null,
  getBingMaps: function () {
    return this.get('promise').then(()=> {
      return Microsoft;
    });
  }
})
