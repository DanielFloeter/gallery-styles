import { __, _x } from '@wordpress/i18n';
import { __experimentalGetCoreBlocks } from '@wordpress/block-library';
import { addFilter } from '@wordpress/hooks';

import './style.scss';
import editInspectorControls from './hooks';

// Add a color attribute
function addAttributes(settings, name) {
	if (typeof settings.attributes !== 'undefined') {
		if (name == 'core/gallery') {
			settings.attributes = Object.assign(settings.attributes, {
				color: {
					type: 'string',
					default: '#f00',
				},
			});
		}
	}
	return settings;
}
 
addFilter(
	'blocks.registerBlockType',
	'core/gallery',
	addAttributes
);

// function addBackgroundColorStyle( props, blockType, attributes ) {
	
// 	if (blockType.name == 'core/gallery') {
// 		const { color } = attributes;
		
// 		if (color != undefined) {
// 			//const root = document.documentElement;
// 			//root?.style.setProperty("--line-color", color);
// 		}
// 	}

// 	return props;
// }
 
// addFilter(
//     'blocks.getSaveContent.extraProps',
//     'core/gallery',
//     addBackgroundColorStyle
// );

addFilter(
	'editor.BlockEdit',
	'core/gallery',
	editInspectorControls
);

wp.blocks.registerBlockStyle('core/gallery', {
	name: 'animate-inside-lines',
	label: 'Animate inside lines'
});