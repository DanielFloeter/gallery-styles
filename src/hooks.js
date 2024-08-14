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
import {
    useSelect,
    useDispatch
} from '@wordpress/data';
import {
    FontSizePicker,
    PanelBody,
    ToggleControl,
    SelectControl
} from '@wordpress/components';
import {
    plugins
} from '@wordpress/icons';
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
            title="Foreground overlay"
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
            title="Background overlay"
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
        const { sortOrder, orderBy, disableCaption, blendMode, textBlendMode, fontSize, innerBlockImagesDB } = attributes;
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

        if ( innerBlockImagesDB.length === 0 && innerBlockImages.every(e => e?.attributes.url.startsWith('http'))) { 
            setAttributes(
                {
                    innerBlockImagesDB: innerBlockImages
                });
        }

        const {
            replaceInnerBlocks,
        } = useDispatch(blockEditorStore);

        function updateDisableCaption(disableCaption) {
            setAttributes(
                {
                    disableCaption
                });
        }

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
                (orderBy === 'db' ?
                (sortOrder ? innerBlockImagesDB : innerBlockImagesDB.reverse()) :
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
                                    if (dateA < dateB) {
                                        return sortOrder ? 1 : -1;
                                    }
                                    if (dateA > dateB) {
                                        return sortOrder ? -1 : 1;
                                    }
                                case 'modified':
                                    const modifiedA = new Date(wp.data.select('core').getMedia(a.attributes.id).modified);
                                    const modifiedB = new Date(wp.data.select('core').getMedia(b.attributes.id).modified);
                                    if (modifiedA < modifiedB) {
                                        return sortOrder ? 1 : -1;
                                    }
                                    if (modifiedA > modifiedB) {
                                        return sortOrder ? -1 : 1;
                                    }
                                case 'random':
                                    return Math.random() - 0.5;
                                case 'exifCreated':
                                    const createdA = wp.data.select('core').getMedia(a.attributes.id).media_details.image_meta.created_timestamp;
                                    const createdB = wp.data.select('core').getMedia(b.attributes.id).media_details.image_meta.created_timestamp;
                                    if (createdA < createdB) {
                                        return sortOrder ? 1 : -1;
                                    }
                                    if (createdA > createdB) {
                                        return sortOrder ? -1 : 1;
                                    }
                            }
                            // ... equal
                            return 0;
                        }
                    ))
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
                    <PanelBody
                        title={__('Text and decoration')}
                        initialOpen={false}
                        icon={plugins}>
                        <ColorPickerLineColor {...props} />
                        <ToggleControl
                            label="Disable captions"
                            checked={disableCaption}
                            onChange={(disableCaption) => updateDisableCaption(disableCaption)}
                        />
                        <ToggleControl
                            label="Blend mode"
                            checked={textBlendMode}
                            onChange={(textBlendMode) => updateTextBlendMode(textBlendMode)}
                        />
                        <FontSizePicker
                            fontSizes={fontSizes}
                            value={fontSize}
                            onChange={(fontSize => updateFontSize(fontSize))}
                        />
                    </PanelBody>
                    <PanelBody
                        title={__('Image')}
                        initialOpen={false}
                        icon={plugins}>
                        <ColorPickerForeground {...props} />
                        <ColorPickerBackground {...props} />
                        <SelectControl
                            label="Blend mode"
                            value={blendMode}
                            options={[
                                { label: 'Multiply', value: 'multiply' },
                                { label: 'Luminosity', value: 'luminosity' },
                            ]}
                            onChange={(blendMode) => updateBlendMode(blendMode)}
                            __nextHasNoMarginBottom
                        />
                    </PanelBody>
                    <PanelBody
                        title={__('Sort')}
                        initialOpen={false}
                        icon={plugins}>
                        <SelectControl
                            label="Order by"
                            value={orderBy}
                            options={[
                                { label: 'As uploaded', value: 'db' },
                                { label: 'Media ID', value: 'none' },
                                { label: 'Name', value: 'name' },
                                { label: 'EXIF created', value: 'exifCreated' },
                                { label: 'WP date', value: 'date' },
                                { label: 'WP modified', value: 'modified' },
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
                        '--disable-caption': props.attributes.disableCaption ? "hidden" : " ",
                    }}>
                    <BlockEdit key="edit" {...props} />
                </div>
            </>
        );
    },
    'withInspectorControls'
);

export default editInspectorControls;
