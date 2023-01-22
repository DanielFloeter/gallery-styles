import { __, _x } from '@wordpress/i18n';
import { __experimentalGetCoreBlocks } from '@wordpress/block-library';
import { addFilter } from '@wordpress/hooks';
import { registerBlockType, unregisterBlockType } from '@wordpress/blocks';
import domReady from '@wordpress/dom-ready';
import './style.scss';
import './editor.scss';
import editInspectorControls from './hooks';
import metadata from './../block.json';

const { name } = metadata;

const icon = {
    src: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> <path d="M20.2 8v11c0 .7-.6 1.2-1.2 1.2H6v1.5h13c1.5 0 2.7-1.2 2.7-2.8V8h-1.5zM18 16.4V4.6c0-.9-.7-1.6-1.6-1.6H4.6C3.7 3 3 3.7 3 4.6v11.8c0 .9.7 1.6 1.6 1.6h11.8c.9 0 1.6-.7 1.6-1.6zM4.5 4.6c0-.1.1-.1.1-.1h11.8c.1 0 .1.1.1.1V12l-2.3-1.7c-.3-.2-.6-.2-.9 0l-2.9 2.1L8 11.3c-.2-.1-.5-.1-.7 0l-2.9 1.5V4.6zm0 11.8v-1.8l3.2-1.7 2.4 1.2c.2.1.5.1.8-.1l2.8-2 2.8 2v2.5c0 .1-.1.1-.1.1H4.6c0-.1-.1-.2-.1-.2z"> </path></svg>,
    foreground: '#62beda',
}

// Add a color attribute
function addAttributes(settings, name) {
    if (typeof settings.attributes !== 'undefined') {
        if (name == 'core/gallery') {
            settings.attributes = Object.assign(settings.attributes, {
                lineColor: {
                    type: 'string',
                    default: '#fff',
                },
                background: {
                    type: 'string',
                    default: '#fff',
                },
                sortOrder: {
                    type: Boolean,
                    default: false
                },
                orderBy: {
                    type: String,
                    default: 'none'
                }
            });
        }
    }
    if (name == 'core/gallery') {
        settings = Object.assign(settings, {
            icon
        });
    }
    return settings;
}

addFilter(
    'blocks.registerBlockType',
    'core/gallery',
    addAttributes
);

addFilter(
    'editor.BlockEdit',
    'core/gallery',
    editInspectorControls
);

[
    { name: 'animate-inside-lines', label: 'Animate inside lines' },
    { name: 'cross', label: 'Cross' },
].forEach(element => {
    wp.blocks.registerBlockStyle(
        'core/gallery',
        element
    );
});

registerBlockType(
    name, {
    ...metadata,
    icon,
}
);
