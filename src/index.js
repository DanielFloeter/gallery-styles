import { __, _x } from '@wordpress/i18n';
import { __experimentalGetCoreBlocks } from '@wordpress/block-library';
import { addFilter } from '@wordpress/hooks';

import './style.scss';
import queryInspectorControls from './hooks';

addFilter(
	'editor.BlockEdit',
	'core/gallery',
	queryInspectorControls
);

wp.blocks.registerBlockStyle('core/gallery', {
	name: 'animate-inside-lines',
	label: 'Animate inside lines'
});