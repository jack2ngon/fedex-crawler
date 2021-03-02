const _ = require('lodash');
const puppeteer = require('puppeteer');
const config = require('../../config');
const { FedexLoadTrackingPageException } = require('../../exceptions/fedex');

const searchByReferences = async (date, zipcode, country, refs) => {
    let products = [];
    let webBrowser;
    try {
        let references = refs.trim().split(',');
        references = _.map(references, (ref) => {
            return `"${ref}"`;
        });
        const argsWebBrowser = [
            '--window-size=1920x1080',
            '--no-sandbox=true',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            // '--disable-setuid-sandbox=true',
            // '--disable-dev-shm-usage=true',
            '--disable-accelerated-2d-canvas=true',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
        ];
        // TODO using proxy
        if (config.ENABLE_PROXY == 'yes') {
            argsWebBrowser.push('--proxy-server=p.webshare.io:80');
        }
        webBrowser = await puppeteer.launch({
            defaultViewport: null,
            headless: false,
            args: argsWebBrowser
        });
        const webPage = (await webBrowser.pages())[0];
        // TODO using proxy
        if (config.ENABLE_PROXY == 'yes') {
            await webPage.authenticate({
                username: 'mfhdhplb-rotate',
                password: 'ey8a1qtaabjz'
            });
        }
        await webPage.setDefaultNavigationTimeout(180000);
        await webPage.setRequestInterception(true);
        webPage.on('request', (request) => {
            if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
                request.abort();
            } else {
                request.continue();
            }
        });
        await webPage.goto('https://www.fedex.com/en-us/tracking.html');
        const results = await Promise.all(_.chunk(references, 30).map(async (batchReferences) => {
            const batchReferencesText = batchReferences.join(',');
            return await crawlFedexShipment(date, batchReferencesText, zipcode, country, webPage);
        }));
        for(const result of results) {
            const foundProducts = _.get(result, 'TrackPackagesResponse.packageList', []);
            _.map(foundProducts, (foundProduct) => {
                const trackingNbr = _.get(foundProduct, 'trackingNbr', '');
                if (trackingNbr.length > 2) {
                    const shipFrom = _.get(foundProduct, 'shipperCity', '') + ',' +
                        _.get(foundProduct, 'shipperStateCD', '') + ',' +
                        _.get(foundProduct, 'shipperCntryCD', '');

                    const shipTo = _.get(foundProduct, 'lastUpdateDestinationAddress.city', '') + ',' +
                        _.get(foundProduct, 'lastUpdateDestinationAddress.stateOrProvinceCode', '') + ',' +
                        _.get(foundProduct, 'lastUpdateDestinationAddress.countryCode', '');

                    const weight = _.get(foundProduct, 'displayPkgLbsWgt', '');
                    let sendToFedexAt = null;
                    const scanEventList = _.get(foundProduct, 'scanEventList', []);
                    _.map(scanEventList, (scanEvent) => {
                        const scanEventSendToFedex = _.get(scanEvent, 'status', '');
                        if (scanEventSendToFedex.toLowerCase().includes('sent to fedex')) {
                            sendToFedexAt = _.get(scanEvent, 'date') + ' ' + _.get(scanEvent, 'time');
                        }
                    });

                    let packageScheduledDeliveryDateTime = _.get(foundProduct, 'displayActDeliveryDateTime', '');
                    if (_.isEmpty(packageScheduledDeliveryDateTime)) {
                        packageScheduledDeliveryDateTime = _.get(foundProduct, 'displayEstDeliveryDateTime', '')
                    }
                    products.push({
                        tracking_number: _.get(foundProduct, 'trackingNbr', ''),
                        package_status: _.get(foundProduct, 'keyStatus', ''),
                        package_scheduled_delivery_datetime: packageScheduledDeliveryDateTime,
                        weight: _.isEmpty(weight) ? _.get(foundProduct, 'displayPkgKgsWgt', '').toUpperCase() : weight.toUpperCase(),
                        weight_unit: null,
                        ship_to: shipTo.toUpperCase(),
                        ship_from: shipFrom.toUpperCase(),
                        shipped_or_billed_date: _.get(foundProduct, 'displayShipDateTime', ''),
                        origin_scan_location: null,
                        send_to_fedex_at: sendToFedexAt,
                    });
                }
            });
        }
    } catch (e) {
        if (webBrowser) {
            await webBrowser.close();
        }
        throw new FedexLoadTrackingPageException(401, '...');
    }
    if (webBrowser) {
        await webBrowser.close();
    }
    return products;
}

const search = async (date, zipcode, country) => {
    const references = generateReferences();
    const chunkReferences = _.chunk(references, 125);

    let products = [];
    let webBrowser;
    const argsWebBrowser = [
        '--window-size=1920x1080',
        '--no-sandbox=true',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        // '--disable-setuid-sandbox=true',
        // '--disable-dev-shm-usage=true',
        '--disable-accelerated-2d-canvas=true',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
    ];
    // TODO using proxy
    if (config.ENABLE_PROXY == 'yes') {
        argsWebBrowser.push('--proxy-server=p.webshare.io:80');
    }
    webBrowser = await puppeteer.launch({
        defaultViewport: null,
        headless: false,
        args: argsWebBrowser
    });
    const webPage = (await webBrowser.pages())[0];

    // TODO using proxy
    if (config.ENABLE_PROXY == 'yes') {
        await webPage.authenticate({
            username: 'mfhdhplb-rotate',
            password: 'ey8a1qtaabjz'
        });
    }

    await webPage.setDefaultNavigationTimeout(180000);
    await webPage.setRequestInterception(true);
    webPage.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
            request.abort();
        } else {
            request.continue();
        }
    });

    try {
        await webPage.goto('https://www.fedex.com/en-us/tracking.html');
        // await webPage.waitForSelector('#track_inbox_track_numbers_area');
    } catch (e) {
        throw new FedexLoadTrackingPageException(401, 'Cannot load fedex tracking page');
    }

    let counter = 0;
    for(const chunkReference of chunkReferences) {
        const results = await Promise.all(_.chunk(chunkReference, 25).map(async (batchReferences) => {
            const batchReferencesText = batchReferences.join(',');
            console.log(batchReferencesText);
            return await crawlFedexShipment(date, batchReferencesText, zipcode, country, webPage);
        }));
        console.log(results);
        for(const result of results) {
            const foundProducts = _.get(result, 'TrackPackagesResponse.packageList', []);
            _.map(foundProducts, (foundProduct) => {
                const trackingNbr = _.get(foundProduct, 'trackingNbr', '');
                if (trackingNbr.length > 2) {
                    const shipFrom = _.get(foundProduct, 'shipperCity', '') + ',' +
                        _.get(foundProduct, 'shipperStateCD', '') + ',' +
                        _.get(foundProduct, 'shipperCntryCD', '');

                    const shipTo = _.get(foundProduct, 'lastUpdateDestinationAddress.city', '') + ',' +
                        _.get(foundProduct, 'lastUpdateDestinationAddress.stateOrProvinceCode', '') + ',' +
                        _.get(foundProduct, 'lastUpdateDestinationAddress.countryCode', '');

                    const weight = _.get(foundProduct, 'displayPkgLbsWgt', '');


                    let sendToFedexAt = null;
                    const scanEventList = _.get(foundProduct, 'scanEventList', []);
                    _.map(scanEventList, (scanEvent) => {
                        const scanEventSendToFedex = _.get(scanEvent, 'status', '');
                        if (scanEventSendToFedex.toLowerCase().includes('sent to fedex')) {
                            sendToFedexAt = _.get(scanEvent, 'date') + ' ' + _.get(scanEvent, 'time');
                        }
                    });

                    let packageScheduledDeliveryDateTime = _.get(foundProduct, 'displayActDeliveryDateTime', '');
                    if (_.isEmpty(packageScheduledDeliveryDateTime)) {
                        packageScheduledDeliveryDateTime = _.get(foundProduct, 'displayEstDeliveryDateTime', '')
                    }
                    products.push({
                        tracking_number: _.get(foundProduct, 'trackingNbr', ''),
                        package_status: _.get(foundProduct, 'keyStatus', ''),
                        package_scheduled_delivery_datetime: packageScheduledDeliveryDateTime,
                        weight: _.isEmpty(weight) ? _.get(foundProduct, 'displayPkgKgsWgt', '').toUpperCase() : weight.toUpperCase(),
                        weight_unit: null,
                        ship_to: shipTo.toUpperCase(),
                        ship_from: shipFrom.toUpperCase(),
                        shipped_or_billed_date: _.get(foundProduct, 'displayShipDateTime', ''),
                        origin_scan_location: null,
                        send_to_fedex_at: sendToFedexAt,
                    });
                }
            });
        }
	    // console.log(products);
        break;
    }
    if (webBrowser) {
        await webBrowser.close();
    }
    return products;
}

const generateReferences = () => {
    const references = [];
    const characters = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    for(const c1 of characters) {
        for(const c2 of characters) {
            references.push(`"${c1}${c2}"`);
        }
    }
    return _.shuffle(references);
}

const crawlFedexShipment = async (date, references, zipcode, country, webPage) => {
    const response = await webPage.evaluate((date, references, zipcode, country) => {
        return new Promise(resolve => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", 'https://www.fedex.com/trackingCal/track', true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4) {
                    if (xhr.status == 403) {
                        resolve({ error: 403 });
                    } else {
                        resolve(JSON.parse(xhr.responseText));
                    }
                }
            }
            const params = `data={"TrackPackagesRequest":{"appType":"WTRK","appDeviceType":"DESKTOP","supportHTML":true,"supportCurrentLocation":true,"uniqueKey":"","processingParameters":{},"trackingInfoList":[{"referenceInfo":{"referenceValueList":[${references}],"shipDate":"${date}","postalCode":"${zipcode}","countryCode":"${country}","accountNbr":""}}]}}&action=altReferenceList&locale=en_US&version=1&format=json`;
            xhr.send(params);
        });
    }, date, references, zipcode, country);
    return response;
}

module.exports = {
    search,
    searchByReferences
};
