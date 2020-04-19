const defaultSearchEngine = 'https://www.google.com/search?q='
const resetTimeout = 1000;

const mainNode = document.getElementsByTagName('main')[0];
const enterArea = document.getElementById('enterArea');
const enterButton = document.getElementById('enterButton');
const enterText = document.getElementById('enterText');
const listArea = document.getElementById('listArea');
const listButton = document.getElementById('listButton');
const listText = document.getElementById('listText');

let resetHandle;

const resetButtons = () => {
    if (listButton) listButton.innerText = 'Copy Tabs';
    if (enterButton) enterButton.innerText = 'Open Tabs';
}

const copyTool = () => {
    navigator.clipboard.writeText(listArea.value).then(() => {
        clearTimeout(resetHandle);
        console.log('Copied to clipboard');
        listButton.innerText = 'Copied!';
        resetHandle = setTimeout(resetButtons, resetTimeout);
    }, err => {
        listButton.innerText = 'Error!';
        console.log(err);
        clearTimeout(resetHandle);
        listButton.title = err;
        resetHandle = setTimeout(resetButtons, resetTimeout);
    });
}

const tabTool = (list, splitOnSpace) => {
    // Iterate over the enter list, and attempt to open tabs
    list.split(splitOnSpace ? /\r\n|\r|\n| / : /\r\n|\r|\n/)
        .map(string => string.replace(/^\s+|\s+$/g, ''))
        .filter(string => string !== '')
        .forEach(string =>
    {
        // Check if it is a URL we can open, otherwise search for it
        if (string.match(/^\w+:/)) {
            if (typeof browser !== 'undefined') {
                browser.tabs.create({'url': string});
            } else if (
                typeof chrome !== 'undefined' &&
                chrome.tabs !== undefined
            ) {
                chrome.tabs.create({'url': string});
            } else {
                console.log('Pretending to open ' + string);
            }
        } else if (string.match(/^[\w\-_]+\.[\w\-_]+/i)) {
            if (typeof browser !== 'undefined') {
                browser.tabs.create({'url': 'http://' + string});
            } else if (
                typeof chrome !== 'undefined' &&
                chrome.tabs !== undefined
            ) {
                chrome.tabs.create({'url': 'http://' + string});
            } else {
                console.log('Pretending to open http://' + string);
            }
        } else {
            if (typeof browser !== 'undefined') {
                browser.search.search({'query': string});
            } else if (
                typeof chrome !== 'undefined' &&
                chrome.tabs !== undefined
            ) {
                // Unfortunately chrome doesn't have a search API
                chrome.tabs.create({'url': defaultSearchEngine + string});
            } else {
                console.log('Pretending to search for ' + string);
            }
        }
    });

    // enterButton won't be defined if accessed via context menu
    if (enterButton) {
        clearTimeout(resetHandle);
        enterButton.innerText = 'Opening!';
        resetHandle = setTimeout(resetButtons, resetTimeout);
    }
}

const updateList = () => {
    if (typeof browser !== 'undefined') {
        browser.tabs.query({currentWindow: true}).then(
            tabs => listArea.value = tabs.map(item => item.url).join("\n")
        );
    } else if (typeof chrome !== 'undefined' && chrome.tabs !== undefined) {
        chrome.tabs.query(
            {currentWindow: true},
            tabs => listArea.value = tabs.map(item => item.url).join("\n")
        );
    } else {
        console.log('Pretending to update list of tabs');
    }
}

const handleEnter = e => {
    if (e.code === 'Enter' && e.ctrlKey) {
        tabTool(enterArea.value);
    } else if (e.code === 'Enter' && e.shiftKey) {
        copyTool(enterArea.value);
    } else {
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
};

const createPopup = () => {
    // Restore saved size and state
    mainNode.style.width = window.localStorage.getItem('width');
    mainNode.style.height = window.localStorage.getItem('height');
    listText.parentElement.classList.toggle('collapsed',
        window.localStorage.getItem('hideList') === 'true'
    );
    listArea.parentElement.classList.toggle('collapsed',
        window.localStorage.getItem('hideList') === 'true'
    );
    enterText.parentElement.classList.toggle('collapsed',
        window.localStorage.getItem('hideEnter') === 'true'
    );
    enterArea.parentElement.classList.toggle('collapsed',
        window.localStorage.getItem('hideEnter') === 'true'
    );

    updateList();

    // Setup listeners
    listButton.addEventListener('click', () => copyTool(listArea.value));
    enterButton.addEventListener('click', () => tabTool(enterArea.value));
    listText.addEventListener('click', () => {
        const state = !listText.parentElement.classList.contains('collapsed') &&
                      !enterText.parentElement.classList.contains('collapsed');
        listText.parentElement.classList.toggle('collapsed', state);
        listArea.parentElement.classList.toggle('collapsed', state);
        window.localStorage.setItem('hideList', state);
        console.log(window.localStorage.getItem('hideList'));
    });
    enterText.addEventListener('click', () => {
        const state = !listText.parentElement.classList.contains('collapsed') &&
                      !enterText.parentElement.classList.contains('collapsed');
        enterText.parentElement.classList.toggle('collapsed', state);
        enterArea.parentElement.classList.toggle('collapsed', state);
        window.localStorage.setItem('hideEnter', state);
    });
    listArea.addEventListener('keypress', handleEnter);
    enterArea.addEventListener('keypress', handleEnter);
}

if (window.location.pathname === '/background.html') {
    // Create a context menu item, and add a listener
    if (typeof browser !== 'undefined') {
        browser.runtime.onInstalled.addListener(() => {
            browser.contextMenus.create({
                'contexts': ['selection'],
                'id': 'TabTool',
                'title': 'TabTool: Open Selection as Tabs',
            });

            browser.contextMenus.onClicked.addListener(info => {
                if (info.menuItemId === 'TabTool') tabTool(info.selectionText);
            });
        });
    } else if (typeof chrome !== 'undefined' && chrome.runtime !== undefined) {
        chrome.runtime.onInstalled.addListener(() => {
            chrome.contextMenus.create({
                'contexts': ['selection'],
                'id': 'TabTool',
                'title': 'TabTool: Open Selection as Tabs',
            });

            chrome.contextMenus.onClicked.addListener(info => {
                if (info.menuItemId === 'TabTool') {
                    // Unlike firefox, chrome replaces newlines with spaces
                    tabTool(info.selectionText, true);
                }
            });
        });
    } else {
        console.log('Pretending to setup runtime');
    }
} else {
    window.addEventListener('load', createPopup);
    window.addEventListener('resize', e => {
        window.localStorage.setItem('width', mainNode.style.width);
        window.localStorage.setItem('height', mainNode.style.height);
    });
    if (typeof browser !== 'undefined') {
        browser.tabs.onUpdated.addListener(updateList);
    } else if (typeof chrome !== 'undefined' && chrome.tabs !== undefined) {
        chrome.tabs.onUpdated.addListener(updateList);
    } else {
        console.log('Pretending to register tab update handler');
    }
}
