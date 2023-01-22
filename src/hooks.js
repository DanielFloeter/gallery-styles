/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
    createHigherOrderComponent
} from '@wordpress/compose';
import {
    store as blockEditorStore,
    InspectorControls
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { useState } from '@wordpress/element';
import {
    PanelBody,
    ToggleControl,
    SelectControl
} from '@wordpress/components';
const {
    PanelColorSettings,
} = wp.blockEditor;

const ColorPickerLineColor = (props) => {
    const { attributes, setAttributes } = props;
    const { lineColor } = attributes;

    const colors = wp.data.select("core/editor").getEditorSettings().colors.filter(
        word => word['origin'] !== 'core'
    );

    const OnChangeColor = (lineColor) => {
        setAttributes({ lineColor });
    }

    return (
        <PanelColorSettings
            title="Line Color"
            colors={colors}
            colorSettings={[
                {
                    label: __('Color'),
                    value: lineColor,
                    onChange: OnChangeColor,
                },
            ]}
        />
    );
};

const ColorPickerBackground = (props) => {
    const { attributes, setAttributes } = props;
    const { background } = attributes;

    const colors = wp.data.select("core/editor").getEditorSettings().colors.filter(
        word => word['origin'] !== 'core'
    );

    const OnChangeColor = (background) => {
        setAttributes({ background });
    }

    return (
        <PanelColorSettings
            title="Background"
            colors={colors}
            colorSettings={[
                {
                    label: __('Color'),
                    value: background,
                    onChange: OnChangeColor,
                },
            ]}
        />
    );
};

/**
 * Override the default edit UI to include layout controls
 *
 * @param {Function} BlockEdit Original component
 * @return {Function}           Wrapped component
 */
const editInspectorControls = createHigherOrderComponent(
    (BlockEdit) => (props) => {
        const { name, attributes, setAttributes } = props;
        const { sortOrder, orderBy } = attributes;
        if (name !== 'core/gallery') {
            return <BlockEdit key="edit" {...props} />;
        }

        const {
            clientId
        } = props;

        const innerBlockImages = useSelect(
            (select) => {
                return select(blockEditorStore).getBlock(clientId)?.innerBlocks;
            },
            [clientId]
        );

        const {
            replaceInnerBlocks,
        } = useDispatch(blockEditorStore);

        function updateImages(sortOrder, orderBy) {
            replaceInnerBlocks(
                clientId,
                innerBlockImages
                    .sort(
                        (a, b) => {
                            switch (orderBy) {
                                case 'none':
                                    return sortOrder ? a.attributes.id - b.attributes.id : b.attributes.id - a.attributes.id;
                                case 'name':
                                    var slugA = wp.data.select('core').getMedia(a.attributes.id).slug;
                                    var slugB = wp.data.select('core').getMedia(b.attributes.id).slug;
                                    if (slugA < slugB) {
                                        return sortOrder ? 1 : -1;
                                    }
                                    if (slugA > slugB) {
                                        return sortOrder ? -1 : 1;
                                    }
                                case 'date':
                                    const dateA = new Date(wp.data.select('core').getMedia(a.attributes.id).date);
                                    const dateB = new Date(wp.data.select('core').getMedia(b.attributes.id).date);
                                    return sortOrder ? dateA - dateB : dateB - dateA;
                                case 'modified':
                                    const modifiedA = new Date(wp.data.select('core').getMedia(a.attributes.id).modified);
                                    const modifiedB = new Date(wp.data.select('core').getMedia(b.attributes.id).modified);
                                    return sortOrder ? modifiedA - modifiedB : modifiedB - modifiedA;
                                case 'random':
                                    return Math.random() - 0.5;
                            }

                            // names must be equal
                            return 0;
                        }
                    )
            );

            setAttributes(
                {
                    orderBy,
                    sortOrder
                });
        }

        return (
            <>
                <InspectorControls>
                    <ColorPickerLineColor {...props} />
                    <ColorPickerBackground {...props} />
                    <PanelBody title={__('Sort Exif')}>
                        <SelectControl
                            label="Order by"
                            value={orderBy}
                            options={[
                                { label: 'none', value: 'none' },
                                { label: 'Name', value: 'name' },
                                { label: 'Date', value: 'date' },
                                { label: 'Modified', value: 'modified' },
                                { label: 'Random', value: 'random' },
                            ]}
                            onChange={(orderBy) => updateImages(sortOrder, orderBy)}
                            __nextHasNoMarginBottom
                        />
                        <ToggleControl
                            label="Sort order (asc)"
                            checked={sortOrder}
                            onChange={(sortOrder) => updateImages(sortOrder, orderBy)}
                        />
                    </PanelBody>
                </InspectorControls>
                <div style={
                    {
                        '--line-color': props.attributes.lineColor,
                        '--background': props.attributes.background
                    }}>
                    <BlockEdit key="edit" {...props} />
                </div>
            </>
        );
    },
    'withInspectorControls'
);

export default editInspectorControls;
