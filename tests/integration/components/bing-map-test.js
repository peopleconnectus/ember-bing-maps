import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('bing-map', 'Integration | Component | bing map', {
  integration: true
});

test('it renders', function(assert) {
  let coords = [
    {
      latitude: 31.231,
      longitude: 90.2312,
      title: 'test'
    }
  ];

  this.set('pins', coords);

  this.render(hbs`{{bing-map pins=pins}}`);

  assert.equal(this.$().text().trim(), '');

});
