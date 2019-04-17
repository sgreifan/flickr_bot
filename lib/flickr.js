'use strict';

const uniqueRandomArray = require('unique-random-array');
const config = require('./config');
const request = require('axios');
const _ = require('lodash');

const baseParams = {
    api_key: config.flickr.key,
    format: 'json',
    nojsoncallback: 1,
    extras: 'description, date_upload, date_taken, owner_name, url_t, url_c',
    per_page: config.flickr.picCount
};

/**
 * get required random number of photos
 *
 * @param {number} photosCount - number of photos to retrieve
 * @returns {Promise<*>}
 */
const getRandomPhotos = async (photosCount) => {
    const params = {
        method: 'flickr.interestingness.getList'
    };

    let res;
    try {
        res = await getPhotos(params, photosCount);
    } catch (err) {
        console.log(err);
        throw err;
    }

    return res;
};

/**
 * get random photos of a specific user
 *
 * @param {number} photosCount - number if ogitis ti retrieve
 * @param {string} userId - the user id
 * @returns {Promise<*>}
 */
const getUserPhotos = async (photosCount, userId) => {
    const params = {
        method: 'flickr.people.getPublicPhotos',
        user_id: userId
    };

    let res;
    try {
        res = await getPhotos(params, photosCount);
    } catch (err) {
        console.log(err);
        throw err;
    }

    return res;
};

/**
 * make the request to flickr to pull the photos
 *
 * @param {object} settings - custom settings per function
 * @param {number} photosCount - number of photos to pull
 * @returns {Promise<*>}
 */
const getPhotos = async (settings, photosCount) => {
    const params = {
        params: Object.assign(settings, baseParams)
    };

    console.log('params -> ', params);

    let res;
    try {
        res = await request.get(config.flickr.apiUrl, params);
    } catch (err) {
        throw err;
    }

    // was the call successfu
    if (res.status !== 200) {
        console.log('res', res);
        throw new Error('failed, bad response from flickr');
    }

    // make sure the pictures are returned
    if (!_.has(res, 'data.photos.photo')) {
        throw new Error('missing photos in flickr response');
    }

    // pick random photos from the pulled batch
    const pickedPhotos = pickPhotos(res.data.photos.photo, photosCount);

    // return only the needed properties
    const readyResult = prepareResult(pickedPhotos);

    return readyResult;
};

/**
 * randomly pick photos from a photo array
 *
 * @param {array} original - an array of photos
 * @param {number} photosCount - the number of unique photos to retrieve
 * @returns {Array}
 */
const pickPhotos = (original, photosCount) => {
    let pickedPhotos = [];

    const random = uniqueRandomArray(original);

    for (let i = 0; i < photosCount; i++) {
        pickedPhotos.push(random());
    }

    return pickedPhotos;
};

/**
 * distill the photo object and leave only the required properties
 *
 * @param {array} original - array of photo objects as returned from flickr
 * @returns {Array}
 */
const prepareResult = (original) => {
    return _.map(original, (photo) => {
        return {
            title: photo.title,
            description: photo.description._content,
            dateTaken: photo.datetaken,
            ownerName: photo.ownername,
            ownerId: photo.owner,
            url_t: photo.url_t,
            url_c: photo.url_c
        };
    });
};

module.exports = {
    getRandomPhotos,
    getUserPhotos
};
