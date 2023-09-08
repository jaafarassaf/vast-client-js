import { updateEstimatedBitrate } from './parser/bitrate';
import { urlHandler } from './urlhandlers/xhr_url_handler';
import { DEFAULT_TIMEOUT } from './urlhandlers/consts';

/**
 * This class provides a method to fetch a VAST document
 * @exports
 * @class Fetcher
 */

export class Fetcher {
  constructor() {
    this.URLTemplateFilters = [];
  }

  /**
   * Inits the fetching properties of the class with the custom values provided as options
   * @param {Object} options - The options to initialize before fetching
   */
  setOptions(options = {}) {
    this.urlHandler = options.urlHandler || options.urlhandler || urlHandler;
    this.fetchingOptions = {
      timeout: options.timeout || DEFAULT_TIMEOUT,
      withCredentials: Boolean(options.withCredentials),
    };
  }

  /**
   * Adds a filter function to the array of filters which are called before fetching a VAST document.
   * @param  {function} filter - The filter function to be added at the end of the array.
   */
  addURLTemplateFilter(filter) {
    if (typeof filter === 'function') {
      this.URLTemplateFilters.push(filter);
    }
  }

  /**
   * Removes the latest URL template filter added.
   */
  removeLastURLTemplateFilter() {
    this.URLTemplateFilters.pop();
  }

  /**
   * Returns the number of URL template filters added.
   * @return {Number}
   */
  countURLTemplateFilters() {
    return this.URLTemplateFilters.length;
  }

  /**
   * Removes all the URL template filters added.
   */
  clearURLTemplateFilters() {
    this.URLTemplateFilters = [];
  }

  /**
   * Fetches a VAST document for the given url.
   * @param {Object} params
   * @param {String} params.url - The url to request the VAST document.
   * @param {Number} params.wrapperDepth - How many times the current url has been wrapped.
   * @param {(String | null)} params.previousUrl - Url of the previous VAST.
   * @param {Object} params.wrapperAd - Previously parsed ad node (Wrapper) related to this fetching.
   * @param {Number} params.maxWrapperDepth - The maximum number of Wrapper that can be fetch
   * @param {Function} params.emitter - The function used to Emit event
   * @return {Promise}
   */
  fetchVAST({
    url,
    maxWrapperDepth,
    emitter,
    wrapperDepth = 0,
    previousUrl = null,
    wrapperAd = null,
  }) {
    return new Promise(async (resolve, reject) => {
      const timeBeforeGet = Date.now();

      // Process url with defined filter
      this.URLTemplateFilters.forEach((filter) => {
        url = filter(url);
      });

      try {
        emitter('VAST-resolving', {
          url,
          previousUrl,
          wrapperDepth,
          maxWrapperDepth: maxWrapperDepth,
          timeout: this.fetchingOptions.timeout,
          wrapperAd,
        });

        let data = await this.urlHandler.get(url, this.fetchingOptions);
        const requestDuration = Math.round(Date.now() - timeBeforeGet);

        emitter('VAST-resolved', {
          url,
          previousUrl,
          wrapperDepth,
          error: data?.error || null,
          duration: requestDuration,
          statusCode: data?.statusCode || null,
          ...data?.details,
        });
        updateEstimatedBitrate(data?.details?.byteLength, requestDuration);

        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.xml);
        }
      } catch (error) {
        console.error(error);
      }
    });
  }
}
