/**
 * @module ol/TileCache
 */
import LRUCache from './structs/LRUCache.js';
import {fromKey, getKey} from './tilecoord.js';

/**
 * @constructor
 * @extends {ol.structs.LRUCache.<ol.Tile>}
 * @param {number=} opt_highWaterMark High water mark.
 * @struct
 */
class TileCache extends LRUCache {
  constructor(opt_highWaterMark) {

    super(opt_highWaterMark);

  }


  /**
   * @param {Object.<string, ol.TileRange>} usedTiles Used tiles.
   */
  expireCache(usedTiles) {
    let tile, zKey;
    while (this.canExpireCache()) {
      tile = this.peekLast();
      zKey = tile.tileCoord[0].toString();
      if (zKey in usedTiles && usedTiles[zKey].contains(tile.tileCoord)) {
        break;
      } else {
        this.pop().dispose();
      }
    }
  }


  /**
   * Prune all tiles from the cache that don't have the same z as the newest tile.
   */
  pruneExceptNewestZ() {
    if (this.getCount() === 0) {
      return;
    }
    const key = this.peekFirstKey();
    const tileCoord = fromKey(key);
    const z = tileCoord[0];
    this.forEach(function(tile) {
      if (tile.tileCoord[0] !== z) {
        this.remove(getKey(tile.tileCoord));
        tile.dispose();
      }
    }, this);
  }
}
export default TileCache;
