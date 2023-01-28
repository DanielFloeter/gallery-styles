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
    FontSizePicker,
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
            title="Line- and text color"
            colors={colors}
            enableAlpha
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

const ColorPickerForeground = (props) => {
    const { attributes, setAttributes } = props;
    const { foreground } = attributes;

    const colors = wp.data.select("core/editor").getEditorSettings().colors.filter(
        word => word['origin'] !== 'core'
    );

    const OnChangeColor = (foreground) => {
        setAttributes({ foreground });
    }

    return (
        <PanelColorSettings
            title="Image foreground overlay"
            colors={colors}
            enableAlpha
            colorSettings={[
                {
                    label: __('Color'),
                    value: foreground,
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
            title="Image background overlay"
            colors={colors}
            enableAlpha
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
        const { sortOrder, orderBy, blendMode, textBlendMode, fontSize } = attributes;
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

        function updateBlendMode(blendMode) {

            setAttributes(
                {
                    blendMode
                });
        }

        function updateTextBlendMode(textBlendMode) {

            setAttributes(
                {
                    textBlendMode
                });
        }

        const fontSizes = wp.data.select("core/editor").getEditorSettings().fontSizes.filter(
            word => word['origin'] !== 'core'
        );

        function updateFontSize(fontSize) {

            setAttributes(
                {
                    fontSize
                });
        }

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
                    <PanelBody>
                        <ToggleControl
                            label="Use line- and text blend mode"
                            checked={textBlendMode}
                            onChange={(textBlendMode) => updateTextBlendMode(textBlendMode)}
                            />
                    </PanelBody>
                    <PanelBody>
                        <FontSizePicker
                            fontSizes={fontSizes}
                            value={ fontSize }
                            onChange={(fontSize=>updateFontSize(fontSize))}
                            />
                    </PanelBody>
                    <ColorPickerForeground {...props} />
                    <ColorPickerBackground {...props} />
                    <PanelBody>
                        <SelectControl
                            label="Image blend mode"
                            value={blendMode}
                            options={[
                                { label: 'Multiply', value: 'multiply' },
                                { label: 'Luminosity', value: 'luminosity' },
                            ]}
                            onChange={(blendMode) => updateBlendMode(blendMode)}
                            __nextHasNoMarginBottom
                        />
                    </PanelBody>
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
                        '--foreground': props.attributes.foreground,
                        '--background': props.attributes.background,
                        '--blend-mode': props.attributes.blendMode,
                        '--text-blend-mode': props.attributes.textBlendMode ? "color-dodge" : "normal",
                        '--font-size': props.attributes.fontSize,
                    }}>
                    <BlockEdit key="edit" {...props} />
                </div>
            </>
        );
    },
    'withInspectorControls'
);

export default editInspectorControls;
