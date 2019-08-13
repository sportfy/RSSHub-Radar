import RSSParser from 'rss-parser';
let rssParser = new RSSParser();

let pageRSS = null;
const defaultTitle = document.querySelector('title') && document.querySelector('title').innerHTML && document.querySelector('title').innerHTML.replace(/<!\[CDATA\[(.*)]]>/, (match, p1) => p1).trim();
const image = document.querySelector('link[rel~="icon"]') && handleUrl(document.querySelector('link[rel~="icon"]').getAttribute('href')) || document.location.origin + '/favicon.ico';

function handleUrl (url) {
    if (url.startsWith('//')) {
        url = document.location.protocol + url;
    } else if (url.startsWith('/')) {
        url = document.location.origin + url;
    } else if (!(/^(http|https):\/\//i.test(url))) {
        url = document.location.href + '/' + url.replace(/^\//g, '');
    }
    return url;
}

export function getPageRSS () {
    if (!pageRSS) {
        pageRSS = [];
        const saved = {};

        // links
        let types = [
            'application/rss+xml',
            'application/atom+xml',
            'application/rdf+xml',
            'application/rss',
            'application/atom',
            'application/rdf',
            'text/rss+xml',
            'text/atom+xml',
            'text/rdf+xml',
            'text/rss',
            'text/atom',
            'text/rdf'
        ];
        let links = document.querySelectorAll('link[type]');
        for (let i = 0; i < links.length; i++) {
            if (links[i].hasAttribute('type') && types.indexOf(links[i].getAttribute('type')) !== -1) {
                let feed_url = links[i].getAttribute('href');

                if (feed_url) {
                    let feed = {
                        url: handleUrl(feed_url),
                        title: links[i].getAttribute('title') || defaultTitle,
                        image,
                    };
                    pageRSS.push(feed);
                    saved[feed.url] = 1;
                }
            }
        }

        // a
        let aEles = document.querySelectorAll('a');
        const check = /([^a-zA-Z]|^)rss([^a-zA-Z]|$)/i;
        for (let i = 0; i < aEles.length; i++) {
            if (aEles[i].hasAttribute('href')) {
                const href = aEles[i].getAttribute('href');

                if (href.match(/\/(feed|rss|atom)(\.(xml|rss|atom))?$/)
                    || aEles[i].hasAttribute('title') && aEles[i].getAttribute('title').match(check)
                    || aEles[i].hasAttribute('class') && aEles[i].getAttribute('class').match(check)
                    || aEles[i].innerText && aEles[i].innerText.match(check)) {
                    let feed = {
                        url: handleUrl(href),
                        title: aEles[i].innerText || aEles[i].getAttribute('title') || defaultTitle,
                        image,
                        uncertain: 1,
                    };
                    if (!saved[feed.url]) {
                        pageRSS.push(feed);
                        saved[feed.url] = 1;
                    }
                }
            }
        }

        // whole page
        if (!saved[document.location.href]) {
            let html;
            if (document.body.childNodes.length === 1 && document.body.childNodes[0].tagName.toLowerCase()) {
                html = document.body.childNodes[0].innerText;
            } else if (document.querySelector('#webkit-xml-viewer-source-xml')) {
                html = document.querySelector('#webkit-xml-viewer-source-xml').innerHTML;
            }

            if (html) {
                rssParser.parseString(html, (err, result) => {
                    if (!err) {
                        chrome.runtime.sendMessage(null, {
                            text: 'addPageRSS',
                            feed: {
                                url: document.location.href,
                                title: result.title,
                                image,
                            },
                        });
                    }
                })
            }
        }
        saved[document.location.href] = 1;
    }
    return pageRSS;
}

export function runCode (code) {
    try {
        return eval(code);
    } catch (e) {
        console.warn('RSS Radar error: ', e);
        return {};
    }
}