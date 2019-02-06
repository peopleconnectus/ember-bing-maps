# ember-bing-maps

## Installation

```bash
ember install ember-bing-maps
```

## Usage

```hbs
{{bing-map 
  options=options
  pins=pins
  eventHandlers=eventHandlers
  infoBoxes=infoBoxes
}}
```

### options
Generally follows bing maps config with some exceptions. All booleans and numbers are passed through mostly untouched. Enums and Objects are constructed inside ember-bing-maps to avoid the race condition of async loading and the global Microsoft.Maps lib.

Please see BingMaps docs for more details on options [MapOptions](https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-api/mapoptions-object) [ViewOptions](https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-api/viewoptions-object)

| key | type | values | default value | description |
|-----|-------|--------|--------------|-------------|
| birdseyeFallback | object | - | - | Used in case the birdseye view is not available to map's location |
| birdseyeFallback<br>&emsp;.type | string | See mapType below | `'aerial'` | Fallback to different map type |
| birdseyeFallback<br>&emsp;.zoom | object | `1-19` | `15` | Zoom level to fallback onto |
| birdseyeFallback<br>&emsp;.navBarMode | string | `'minified', 'compact', 'default'` |`'compact'` | Menu type to fallback onto |
| birdseyeFallback<br>&emsp;.navBarOrientation | string | `'horizontal', 'vertical'` | `'vertical'` | Menu orietation to fallback onto |
| defaultCenter | object | - | A rectangle around the USA | Used to construct a [LocationRect](https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-api/locationrect-class) in case no pins are configured |
| enableClickableLogo | boolean | `true/false` | `true` | Makes bing logo not clickable |
| mapType | string | `'aerial', 'road', 'birdseye', ...` | `'road'` | The name of the map type to load with. See [MapTypeId](https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-api/maptypeid-enumeration) |
| mapTypeHover | boolean | `true/false` | `false`| add mouse over menu aka disableMapTypeSelectorMouseOver |
| navBarMode | string | `'minified', 'compact', 'default'` | `'minified'` | Menu mode, NOTE: some modes are buggy in different mapTypes.. |
| navBarOrientation | string | `'horizontal', 'vertical'` | `'vertical'` | Used in case the birdseye view is not available to map's location |
| padding | integer | * | 20 | Amount of pixels to pad around the bounds of the map view |
| showMapTypeSelector | boolean | `true/false` | `true` | Show map type selector in menu |
| showTrafficButton | boolean | `true/false` | `false` | Show traffic view button |
| supportedMapTypes | array of mapType strings | See [MapTypeId](https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-api/maptypeid-enumeration) | `['road', 'aerial', 'streetside', 'birdseye']` | Add more map types to the map type selector |
| zoom | integer | 1-19 | 10 | Maps starting zoom position, higher => more zoom |

### pins

An array of coordinates with [Options](https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-api/pushpinoptions-object)

Example: 
```javascript
[{
  latitude: 47.603791,
  longitude:  -122.334055,
  options: {
    icon: '/assets/img/location-pin.png',
    // This is used for eventHandlerss.pins, drop in any metadata needed for event callback.
    metadata: {
      title: 'mySpecialTitle'
    }
  }
}]
```

### eventHandlers

An object of event handlers to be added (for now just on pins). Arguments passed to handlers are `(event, infoBox, map)`. This allows for manipulation to the map and infoBox at the user's discretion. Note the infoBox is shared across the map

List of supported events: 
 *  [PushPin](https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-api/pushpin-class)

Example:
```javascript
eventHandlers: {
  pin: {
    click: (e, bingMapCtx) => {
      let { map, infoBox, customInfoBoxes } = getProperties(bingMapCtx, 'map', 'infoBox', 'customInfoBoxes');
      if (e.metadata.title === 'mySpecialPin') {
        let mapType = bingMapCtx.Microsoft.getMapTypeId();
        if (mapType === bingMapCtx.Microsoft.Maps.MapTypeId.aerial) {
          // do something interesting?
        }
      }
    }
  }
}
```

### infoBoxes

Used to generate specific custom infoBoxes. We take the `infoBoxTemplate` and replace the `{description}` with 
[InfoBox Class](https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-api/infobox-class)
[InfoBox Options](https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-api/infoboxoptions-object)

Example: 
```javascript
[{
  location: {
    latitude: 37.905249, 
    longitude: -85.927439
  },
  options: {
    htmlContent: `
      <div class="ember-bing-maps-dialogue-box">
        'X marks the spot.'
      </div>`,
    closeDelayTime: 100
  }
}]
```


# Contributing 

## Installation

* `git clone <repository-url>` this repository
* `cd ember-bing-maps`
* `npm install`

## Running

* `ember serve`
* Visit your app at [http://localhost:4200](http://localhost:4200).

## Running Tests

* `npm test` (Runs `ember try:each` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).
