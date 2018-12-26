import Component from '@ember/component';
import { inject as service } from '@ember/service';

export default Component.extend({
  bingMapService: service(),
  isLoaded: false,
  tagName: '',
  init() {
    this._super();
    this.get('bingMapService').getBingMaps().then(Microsoft => {
      this.set('isLoaded', true);
      this.set('microsoft', Microsoft);
    });
  }
});
