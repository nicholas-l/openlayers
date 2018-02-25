/**
 * @module ol/style/IconImage
 */
import {createCanvasContext2D} from '../dom.js';
import {listenOnce, unlistenByKey} from '../events.js';
import EventTarget from '../events/EventTarget.js';
import EventType from '../events/EventType.js';
import ImageState from '../ImageState.js';
import {iconImageCache} from '../style.js';

/**
 * @constructor
 * @param {Image|HTMLCanvasElement} image Image.
 * @param {string|undefined} src Src.
 * @param {ol.Size} size Size.
 * @param {?string} crossOrigin Cross origin.
 * @param {ol.ImageState} imageState Image state.
 * @param {ol.Color} color Color.
 * @extends {ol.events.EventTarget}
 */
class IconImage extends EventTarget {
  constructor(image, src, size, crossOrigin, imageState,
    color) {

    super();

    /**
     * @private
     * @type {Image|HTMLCanvasElement}
     */
    this.hitDetectionImage_ = null;

    /**
     * @private
     * @type {Image|HTMLCanvasElement}
     */
    this.image_ = !image ? new Image() : image;

    if (crossOrigin !== null) {
      this.image_.crossOrigin = crossOrigin;
    }

    /**
     * @private
     * @type {HTMLCanvasElement}
     */
    this.canvas_ = color ?
      /** @type {HTMLCanvasElement} */ (document.createElement('CANVAS')) :
      null;

    /**
     * @private
     * @type {ol.Color}
     */
    this.color_ = color;

    /**
     * @private
     * @type {Array.<ol.EventsKey>}
     */
    this.imageListenerKeys_ = null;

    /**
     * @private
     * @type {ol.ImageState}
     */
    this.imageState_ = imageState;

    /**
     * @private
     * @type {ol.Size}
     */
    this.size_ = size;

    /**
     * @private
     * @type {string|undefined}
     */
    this.src_ = src;

    /**
     * @private
     * @type {boolean}
     */
    this.tainting_ = false;
    if (this.imageState_ == ImageState.LOADED) {
      this.determineTainting_();
    }

  }


  /**
   * @private
   */
  determineTainting_() {
    const context = createCanvasContext2D(1, 1);
    try {
      context.drawImage(this.image_, 0, 0);
      context.getImageData(0, 0, 1, 1);
    } catch (e) {
      this.tainting_ = true;
    }
  }


  /**
   * @private
   */
  dispatchChangeEvent_() {
    this.dispatchEvent(EventType.CHANGE);
  }


  /**
   * @private
   */
  handleImageError_() {
    this.imageState_ = ImageState.ERROR;
    this.unlistenImage_();
    this.dispatchChangeEvent_();
  }


  /**
   * @private
   */
  handleImageLoad_() {
    this.imageState_ = ImageState.LOADED;
    if (this.size_) {
      this.image_.width = this.size_[0];
      this.image_.height = this.size_[1];
    }
    this.size_ = [this.image_.width, this.image_.height];
    this.unlistenImage_();
    this.determineTainting_();
    this.replaceColor_();
    this.dispatchChangeEvent_();
  }


  /**
   * @param {number} pixelRatio Pixel ratio.
   * @return {Image|HTMLCanvasElement} Image or Canvas element.
   */
  getImage(pixelRatio) {
    return this.canvas_ ? this.canvas_ : this.image_;
  }


  /**
   * @return {ol.ImageState} Image state.
   */
  getImageState() {
    return this.imageState_;
  }


  /**
   * @param {number} pixelRatio Pixel ratio.
   * @return {Image|HTMLCanvasElement} Image element.
   */
  getHitDetectionImage(pixelRatio) {
    if (!this.hitDetectionImage_) {
      if (this.tainting_) {
        const width = this.size_[0];
        const height = this.size_[1];
        const context = createCanvasContext2D(width, height);
        context.fillRect(0, 0, width, height);
        this.hitDetectionImage_ = context.canvas;
      } else {
        this.hitDetectionImage_ = this.image_;
      }
    }
    return this.hitDetectionImage_;
  }


  /**
   * @return {ol.Size} Image size.
   */
  getSize() {
    return this.size_;
  }


  /**
   * @return {string|undefined} Image src.
   */
  getSrc() {
    return this.src_;
  }


  /**
   * Load not yet loaded URI.
   */
  load() {
    if (this.imageState_ == ImageState.IDLE) {
      this.imageState_ = ImageState.LOADING;
      this.imageListenerKeys_ = [
        listenOnce(this.image_, EventType.ERROR,
          this.handleImageError_, this),
        listenOnce(this.image_, EventType.LOAD,
          this.handleImageLoad_, this)
      ];
      try {
        this.image_.src = this.src_;
      } catch (e) {
        this.handleImageError_();
      }
    }
  }


  /**
   * @private
   */
  replaceColor_() {
    if (this.tainting_ || this.color_ === null) {
      return;
    }

    this.canvas_.width = this.image_.width;
    this.canvas_.height = this.image_.height;

    const ctx = this.canvas_.getContext('2d');
    ctx.drawImage(this.image_, 0, 0);

    const imgData = ctx.getImageData(0, 0, this.image_.width, this.image_.height);
    const data = imgData.data;
    const r = this.color_[0] / 255.0;
    const g = this.color_[1] / 255.0;
    const b = this.color_[2] / 255.0;

    for (let i = 0, ii = data.length; i < ii; i += 4) {
      data[i] *= r;
      data[i + 1] *= g;
      data[i + 2] *= b;
    }
    ctx.putImageData(imgData, 0, 0);
  }


  /**
   * Discards event handlers which listen for load completion or errors.
   *
   * @private
   */
  unlistenImage_() {
    this.imageListenerKeys_.forEach(unlistenByKey);
    this.imageListenerKeys_ = null;
  }
}

/**
 * @param {Image|HTMLCanvasElement} image Image.
 * @param {string} src Src.
 * @param {ol.Size} size Size.
 * @param {?string} crossOrigin Cross origin.
 * @param {ol.ImageState} imageState Image state.
 * @param {ol.Color} color Color.
 * @return {ol.style.IconImage} Icon image.
 */
IconImage.get = function(image, src, size, crossOrigin, imageState,
  color) {
  let iconImage = iconImageCache.get(src, crossOrigin, color);
  if (!iconImage) {
    iconImage = new IconImage(
      image, src, size, crossOrigin, imageState, color);
    iconImageCache.set(src, crossOrigin, color, iconImage);
  }
  return iconImage;
};


export default IconImage;
