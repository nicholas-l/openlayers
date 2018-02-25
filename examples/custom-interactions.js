import Feature from '../src/ol/Feature.js';
import Map from '../src/ol/Map.js';
import View from '../src/ol/View.js';
import LineString from '../src/ol/geom/LineString.js';
import Point from '../src/ol/geom/Point.js';
import Polygon from '../src/ol/geom/Polygon.js';
import {defaults as defaultInteractions} from '../src/ol/interaction.js';
import PointerInteraction from '../src/ol/interaction/Pointer.js';
import TileLayer from '../src/ol/layer/Tile.js';
import VectorLayer from '../src/ol/layer/Vector.js';
import TileJSON from '../src/ol/source/TileJSON.js';
import VectorSource from '../src/ol/source/Vector.js';
import Fill from '../src/ol/style/Fill.js';
import Icon from '../src/ol/style/Icon.js';
import Stroke from '../src/ol/style/Stroke.js';
import Style from '../src/ol/style/Style.js';


/**
 * Define a namespace for the application.
 */
const app = {};


/**
 * @constructor
 * @extends {ol.interaction.Pointer}
 */
app.Drag = class extends PointerInteraction {
  constructor() {

    super({
      handleDownEvent: app.Drag.prototype.handleDownEvent,
      handleDragEvent: app.Drag.prototype.handleDragEvent,
      handleMoveEvent: app.Drag.prototype.handleMoveEvent,
      handleUpEvent: app.Drag.prototype.handleUpEvent
    });

    /**
     * @type {ol.Pixel}
     * @private
     */
    this.coordinate_ = null;

    /**
     * @type {string|undefined}
     * @private
     */
    this.cursor_ = 'pointer';

    /**
     * @type {ol.Feature}
     * @private
     */
    this.feature_ = null;

    /**
     * @type {string|undefined}
     * @private
     */
    this.previousCursor_ = undefined;

  }


  /**
   * @param {ol.MapBrowserEvent} evt Map browser event.
   * @return {boolean} `true` to start the drag sequence.
   */
  handleDownEvent(evt) {
    const map = evt.map;

    const feature = map.forEachFeatureAtPixel(evt.pixel,
      function(feature) {
        return feature;
      });

    if (feature) {
      this.coordinate_ = evt.coordinate;
      this.feature_ = feature;
    }

    return !!feature;
  }


  /**
   * @param {ol.MapBrowserEvent} evt Map browser event.
   */
  handleDragEvent(evt) {
    const deltaX = evt.coordinate[0] - this.coordinate_[0];
    const deltaY = evt.coordinate[1] - this.coordinate_[1];

    const geometry = this.feature_.getGeometry();
    geometry.translate(deltaX, deltaY);

    this.coordinate_[0] = evt.coordinate[0];
    this.coordinate_[1] = evt.coordinate[1];
  }


  /**
   * @param {ol.MapBrowserEvent} evt Event.
   */
  handleMoveEvent(evt) {
    if (this.cursor_) {
      const map = evt.map;
      const feature = map.forEachFeatureAtPixel(evt.pixel,
        function(feature) {
          return feature;
        });
      const element = evt.map.getTargetElement();
      if (feature) {
        if (element.style.cursor != this.cursor_) {
          this.previousCursor_ = element.style.cursor;
          element.style.cursor = this.cursor_;
        }
      } else if (this.previousCursor_ !== undefined) {
        element.style.cursor = this.previousCursor_;
        this.previousCursor_ = undefined;
      }
    }
  }


  /**
   * @return {boolean} `false` to stop the drag sequence.
   */
  handleUpEvent() {
    this.coordinate_ = null;
    this.feature_ = null;
    return false;
  }
};

const pointFeature = new Feature(new Point([0, 0]));

const lineFeature = new Feature(
  new LineString([[-1e7, 1e6], [-1e6, 3e6]]));

const polygonFeature = new Feature(
  new Polygon([[[-3e6, -1e6], [-3e6, 1e6],
    [-1e6, 1e6], [-1e6, -1e6], [-3e6, -1e6]]]));


const map = new Map({
  interactions: defaultInteractions().extend([new app.Drag()]),
  layers: [
    new TileLayer({
      source: new TileJSON({
        url: 'https://api.tiles.mapbox.com/v3/mapbox.geography-class.json?secure'
      })
    }),
    new VectorLayer({
      source: new VectorSource({
        features: [pointFeature, lineFeature, polygonFeature]
      }),
      style: new Style({
        image: new Icon(/** @type {olx.style.IconOptions} */ ({
          anchor: [0.5, 46],
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          opacity: 0.95,
          src: 'data/icon.png'
        })),
        stroke: new Stroke({
          width: 3,
          color: [255, 0, 0, 1]
        }),
        fill: new Fill({
          color: [0, 0, 255, 0.6]
        })
      })
    })
  ],
  target: 'map',
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});
