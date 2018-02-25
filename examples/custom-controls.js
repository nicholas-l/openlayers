
import Map from '../src/ol/Map.js';
import View from '../src/ol/View.js';
import {defaults as defaultControls} from '../src/ol/control.js';
import Control from '../src/ol/control/Control.js';
import TileLayer from '../src/ol/layer/Tile.js';
import OSM from '../src/ol/source/OSM.js';


/**
 * Define a namespace for the application.
 */
window.app = {};
const app = window.app;


//
// Define rotate to north control.
//


/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} opt_options Control options.
 */
app.RotateNorthControl = class extends Control {
  constructor(opt_options) {

    const options = opt_options || {};

    const button = document.createElement('button');
    button.innerHTML = 'N';


    const element = document.createElement('div');
    element.className = 'rotate-north ol-unselectable ol-control';
    element.appendChild(button);

    super({
      element: element,
      target: options.target
    });
    const this_ = this;
    const handleRotateNorth = function() {
      this_.getMap().getView().setRotation(0);
    };

    button.addEventListener('click', handleRotateNorth, false);
    button.addEventListener('touchstart', handleRotateNorth, false);

  }
};


//
// Create map, giving it a rotate to north control.
//


const map = new Map({
  controls: defaultControls({
    attributionOptions: {
      collapsible: false
    }
  }).extend([
    new app.RotateNorthControl()
  ]),
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  target: 'map',
  view: new View({
    center: [0, 0],
    zoom: 3,
    rotation: 1
  })
});
