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

        if ( innerBlockImagesDB.length === 0 && innerBlockImages?.length && innerBlockImages.every(e => e?.attributes?.id)) { 
            setAttributes(
                {
                    innerBlockImagesDB: innerBlockImages
                });
        }

        /**
         * The media records behind the gallery images, keyed by attachment id.
         *
         * `getMedia()` resolves over the REST API: the first call for an id
         * returns `undefined` and merely starts the request. Asking for the
         * records here - inside `useSelect` - kicks that request off while the
         * inspector renders and re-renders the block once the records have
         * arrived, so sorting never reads a `slug` or a `title` off an
         * undefined record.
         */
        const imageIds = (innerBlockImages ?? [])
            .map((image) => image?.attributes?.id)
            .filter(Boolean);

        const media = useSelect(
            (select) => {
                const records = {};
                imageIds.forEach((id) => {
                    records[id] = select('core').getMedia(id);
                });
                return records;
            },
            [imageIds.join(',')]
        );

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

        /**
         * The value an image is sorted by, or `undefined` when it cannot be
         * read - an unresolved media record, an image without EXIF data.
         *
         * @param {Object} image   Inner image block.
         * @param {string} orderBy Sort criterion.
         * @return {*} Comparable value, or `undefined`.
         */
        function getSortValue(image, orderBy) {
            const record = media[image?.attributes?.id];

            switch (orderBy) {
                case 'none':
                    return image?.attributes?.id;
                case 'title':
                    return record?.title?.rendered;
                case 'name':
                    return record?.slug;
                case 'date':
                    return record?.date ? Date.parse(record.date) : undefined;
                case 'modified':
                    return record?.modified
                        ? Date.parse(record.modified)
                        : undefined;
                case 'exifCreated':
                    return record?.media_details?.image_meta
                        ?.created_timestamp;
            }

            return undefined;
        }

        /**
         * Compare two images. Images whose sort value is unavailable keep
         * their current position instead of throwing.
         *
         * @param {Object}  a         First inner image block.
         * @param {Object}  b         Second inner image block.
         * @param {string}  orderBy   Sort criterion.
         * @param {boolean} sortOrder Whether to sort descending.
         * @return {number} Comparison result.
         */
        function compareImages(a, b, orderBy, sortOrder) {
            if (orderBy === 'random') {
                return Math.random() - 0.5;
            }

            const valueA = getSortValue(a, orderBy);
            const valueB = getSortValue(b, orderBy);

            if (valueA === undefined || valueB === undefined) {
                return 0;
            }
            if (valueA < valueB) {
                return sortOrder ? 1 : -1;
            }
            if (valueA > valueB) {
                return sortOrder ? -1 : 1;
            }
            // ... equal
            return 0;
        }

        function updateImages(sortOrder, orderBy) {
            replaceInnerBlocks(
                clientId,
                orderBy === 'db'
                    ? innerBlockImagesDB
                    : [...(innerBlockImages ?? [])].sort((a, b) =>
                          compareImages(a, b, orderBy, sortOrder)
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
