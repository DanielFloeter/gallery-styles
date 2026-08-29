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
import { useEffect, useRef } from '@wordpress/element';
const {
    PanelColorSettings,
} = wp.blockEditor;

/**
 * Gutenberg link destination for the lightbox built into WordPress.
 */
const LINK_DESTINATION_LIGHTBOX = 'lightbox';

/**
 * Whether the installed WordPress version offers a lightbox
 * ("Expand on click" / "Enlarge image") for the image block.
 *
 * WordPress 6.5+ uses the `lightbox` attribute, WordPress 6.4 used
 * `behaviors.lightbox`. Older versions have neither.
 *
 * @return {boolean} True when a lightbox attribute exists.
 */
function hasLightboxSupport() {
    const attributes =
        wp?.blocks?.getBlockType?.('core/image')?.attributes ?? {};
    return 'lightbox' in attributes || 'behaviors' in attributes;
}


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

        /**
         * Issue #10: "Expand on click" as the default link destination.
         *
         * Only the `linkTo` attribute of the gallery is set, and only while the
         * gallery is still empty. From there on core writes the lightbox onto
         * every image it puts into the gallery, so the plugin never touches the
         * image blocks itself - and cannot end up fighting core over them.
         *
         * A gallery that already has images comes from existing content and is
         * left untouched.
         */
        const lightboxSupported = hasLightboxSupport();

        const isNewGallery = useRef(null);
        if (isNewGallery.current === null) {
            isNewGallery.current = (innerBlockImages ?? []).length === 0;
        }

        const defaultApplied = useRef(false);

        useEffect(() => {
            if (
                defaultApplied.current ||
                !isNewGallery.current ||
                !lightboxSupported
            ) {
                return;
            }
            defaultApplied.current = true;
            setAttributes({ linkTo: LINK_DESTINATION_LIGHTBOX });
        }, [lightboxSupported]);


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
                innerBlockImagesDB :
                innerBlockImages
                    .sort(
                        (a, b) => {
                            switch (orderBy) {
                                case 'none':
                                    return sortOrder ? a.attributes.id - b.attributes.id : b.attributes.id - a.attributes.id;
                                case 'title' :
                                    var titleA = wp.data.select('core').getMedia(a.attributes.id).title.rendered;
                                    var titleB = wp.data.select('core').getMedia(b.attributes.id).title.rendered;
                                    if (titleA < titleB) {
                                        return sortOrder ? 1 : -1;
                                    }
                                    if (titleA > titleB) {
                                        return sortOrder ? -1 : 1;
                                    }
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
                        title={__('Text')}
                        initialOpen={false}>
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
                        initialOpen={false}>
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
                        initialOpen={false}>
                        <SelectControl
                            label="Order by"
                            value={orderBy}
                            options={[
                                { label: 'As uploaded', value: 'db' },
                                { label: 'Media ID', value: 'none' },
                                { label: 'File name', value: 'name' },
                                { label: 'EXIF created', value: 'exifCreated' },
                                { label: 'WP Title', value: 'title' },
                                { label: 'WP date', value: 'date' },
                                { label: 'WP modified', value: 'modified' },
                                // { label: 'Random', value: 'random' },
                            ]}
                            onChange={(orderBy) => updateImages(sortOrder, orderBy)}
                            __nextHasNoMarginBottom
                        />
                        <ToggleControl
                            label="Sort order (asc)"
                            checked={sortOrder}
                            onChange={(sortOrder) => {
                                innerBlockImagesDB.reverse(); 
                                updateImages(sortOrder, orderBy)
                            }}
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
