/* eslint-env node */
'use strict';

module.exports = {
  name: 'ember-bing-maps',
  contentFor(type) {
    if (type === 'body') {
      return `<script type="text/javascript" src="https://www.bing.com/api/maps/mapcontrol"></script>`;
    }
  }
};
