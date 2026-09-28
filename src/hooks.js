/**
 * WordPress dependencies
 */
import { __, _x } from '@wordpress/i18n';
import {
    createHigherOrderComponent
} from '@wordpress/compose';
import {
    store as blockEditorStore,
    InspectorControls,
    useSettings
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
 * How long an uploaded image is watched after its upload has finished.
 *
 * The image block may store the result of an upload more than once, and every
 * time it writes its own default link over the gallery's. See
 * `useGalleryLinkForUploads()`.
 */
const UPLOAD_SETTLE_TIME = 2000;

/**
 * Reads the lightbox setting from theme.json. `useSettings()` is only
 * available from WordPress 6.5 on - the version the `lightbox` attribute
 * arrived with.
 *
 * @return {Object|undefined} The lightbox setting.
 */
function useLightboxSetting() {
    return useSettings ? useSettings('blocks.core/image.lightbox')[0] : undefined;
}

/**
 * The link attributes the gallery gives one of its images - a copy of
 * `getHrefAndDestination()` in core/gallery.
 *
 * @param {Object} image           Inner image block.
 * @param {Object} record          Media record of the image.
 * @param {string} linkTo          Link destination of the gallery.
 * @param {Object} lightboxSetting Lightbox setting from theme.json.
 * @return {Object|null} Link attributes, or `null` while they cannot be told.
 */
function getGalleryLink(image, record, linkTo, lightboxSetting) {
    const { attributes } = image;
    const hasLightbox =
        'lightbox' in
        (wp?.blocks?.getBlockType?.('core/image')?.attributes ?? {});
    const noLightbox =
        hasLightbox && lightboxSetting?.enabled
            ? { ...attributes.lightbox, enabled: false }
            : undefined;

    switch (linkTo) {
        case 'file':
        case 'media':
            if (!record) {
                return null;
            }
            return {
                href: record.source_url,
                linkDestination: 'media',
                ...(hasLightbox && { lightbox: noLightbox }),
            };
        case 'post':
        case 'attachment':
            if (!record) {
                return null;
            }
            return {
                href: record.link,
                linkDestination: 'attachment',
                ...(hasLightbox && { lightbox: noLightbox }),
            };
        case LINK_DESTINATION_LIGHTBOX:
            return {
                href: undefined,
                linkDestination: 'none',
                ...(hasLightbox && {
                    lightbox: !lightboxSetting?.enabled
                        ? { ...attributes.lightbox, enabled: true }
                        : undefined,
                }),
            };
        case 'none':
            return {
                href: undefined,
                linkDestination: 'none',
                ...(hasLightbox && { lightbox: undefined }),
            };
    }

    return null;
}

/**
 * Whether the image already carries the given link attributes.
 *
 * @param {Object} image Inner image block.
 * @param {Object} link  Link attributes.
 * @return {boolean} True when nothing has to change.
 */
function hasLink(image, link) {
    return Object.keys(link).every(
        (key) =>
            JSON.stringify(image.attributes[key]) === JSON.stringify(link[key])
    );
}

/**
 * Temporary workaround for https://github.com/WordPress/gutenberg/pull/83557
 *
 * Images uploaded straight into a gallery (drag and drop, "Upload") do not get
 * the gallery's link setting: once the upload has finished, the image block
 * writes the default link of `image_default_link_type` and core/gallery keeps
 * that one instead of its own `linkTo`. With "Expand on click" the uploaded
 * images therefore lose the lightbox.
 *
 * An uploaded image is recognised by its `blob` attribute. As soon as the
 * upload is done, the gallery's link is written onto the image - and written
 * again should the image block overwrite it while the upload settles. After
 * that the image is left alone, so a link chosen for the single image sticks.
 *
 * Remove once the fix has reached every supported WordPress version.
 *
 * @param {Array}  innerBlockImages Inner image blocks.
 * @param {Object} media            Media records keyed by attachment id.
 * @param {string} linkTo           Link destination of the gallery.
 */
function useGalleryLinkForUploads(innerBlockImages, media, linkTo) {
    const lightboxSetting = useLightboxSetting();
    const {
        updateBlockAttributes,
        __unstableMarkNextChangeAsNotPersistent,
    } = useDispatch(blockEditorStore);

    // clientId => time the upload was seen finished (0 while uploading).
    const uploads = useRef(new Map());

    useEffect(() => {
        const now = Date.now();
        const images = innerBlockImages ?? [];

        // Forget images that were removed from the gallery.
        uploads.current.forEach((finished, clientId) => {
            if (!images.some((image) => image.clientId === clientId)) {
                uploads.current.delete(clientId);
            }
        });

        images.forEach((image) => {
            const { clientId, attributes } = image;
            const uploading =
                !!attributes.blob || !!attributes.url?.startsWith('blob:');

            if (uploading) {
                uploads.current.set(clientId, 0);
                return;
            }
            if (!uploads.current.has(clientId) || !attributes.id) {
                return;
            }

            let finished = uploads.current.get(clientId);
            if (!finished) {
                finished = now;
                uploads.current.set(clientId, finished);
            }
            if (now - finished > UPLOAD_SETTLE_TIME) {
                uploads.current.delete(clientId);
                return;
            }

            const link = getGalleryLink(
                image,
                media[attributes.id],
                linkTo,
                lightboxSetting
            );
            if (link && !hasLink(image, link)) {
                __unstableMarkNextChangeAsNotPersistent?.();
                updateBlockAttributes(clientId, link);
            }
        });
    }, [innerBlockImages, media, linkTo, lightboxSetting]);
}

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
            title={__( 'Line- and text color', 'gallery-styles' )}
            colors={colors}
            enableAlpha
            colorSettings={[
                {
                    label: __( 'Color', 'gallery-styles' ),
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
            title={__( 'Foreground overlay', 'gallery-styles' )}
            colors={colors}
            enableAlpha
            colorSettings={[
                {
                    label: __( 'Color', 'gallery-styles' ),
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
            title={__( 'Background overlay', 'gallery-styles' )}
            colors={colors}
            enableAlpha
            colorSettings={[
                {
                    label: __( 'Color', 'gallery-styles' ),
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
        const { sortOrder, orderBy, disableCaption, blendMode, textBlendMode, fontSize, innerBlockImagesDB, uploadOrder } = attributes;
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

        /**
         * The upload order, kept as a list of attachment ids.
         *
         * Only the order is stored, never the image blocks themselves: a
         * snapshot of whole blocks goes stale and would play back the captions,
         * alt texts and sizes an image had at upload time.
         *
         * Galleries written by an earlier version carry that snapshot in
         * `innerBlockImagesDB`. Their ids are taken over as they stand - for
         * those galleries the snapshot is the only remaining trace of the
         * upload order, and snapshotting the current inner blocks instead would
         * silently freeze whatever sorting they happen to be showing.
         */
        useEffect(() => {
            if (uploadOrder.length) {
                return;
            }

            if (innerBlockImagesDB.length) {
                setAttributes({
                    uploadOrder: innerBlockImagesDB.map(
                        (image) => image?.attributes?.id
                    ),
                });
                return;
            }

            if (
                innerBlockImages?.length &&
                innerBlockImages.every((e) => e?.attributes?.id)
            ) {
                setAttributes({
                    uploadOrder: innerBlockImages.map(
                        (image) => image.attributes.id
                    ),
                });
            }
        }, [uploadOrder.length, innerBlockImages]);

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

        useGalleryLinkForUploads(innerBlockImages, media, attributes.linkTo);

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
         * read - an unresolved media record, an image without EXIF data, an
         * image that was added after the upload order was written.
         *
         * @param {Object} image   Inner image block.
         * @param {string} orderBy Sort criterion.
         * @return {*} Comparable value, or `undefined`.
         */
        function getSortValue(image, orderBy) {
            const record = media[image?.attributes?.id];

            switch (orderBy) {
                case 'db': {
                    // An image the upload order does not know keeps its
                    // position: `undefined` makes `compareImages()` return 0,
                    // and sorting is stable.
                    const index = uploadOrder.indexOf(image?.attributes?.id);
                    return index === -1 ? undefined : index;
                }
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
                [...(innerBlockImages ?? [])].sort((a, b) =>
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
                        title={__( 'Text', 'gallery-styles' )}
                        initialOpen={false}>
                        <ColorPickerLineColor {...props} />
                        <ToggleControl
                            label={__( 'Disable captions', 'gallery-styles' )}
                            checked={disableCaption}
                            onChange={(disableCaption) => updateDisableCaption(disableCaption)}
                        />
                        <ToggleControl
                            label={__( 'Blend mode', 'gallery-styles' )}
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
                        title={__( 'Image', 'gallery-styles' )}
                        initialOpen={false}>
                        <ColorPickerForeground {...props} />
                        <ColorPickerBackground {...props} />
                        <SelectControl
                            label={__( 'Blend mode', 'gallery-styles' )}
                            value={blendMode}
                            options={[
                                { label: __( 'Multiply', 'gallery-styles' ), value: 'multiply' },
                                { label: __( 'Luminosity', 'gallery-styles' ), value: 'luminosity' },
                            ]}
                            onChange={(blendMode) => updateBlendMode(blendMode)}
                            __nextHasNoMarginBottom
                        />
                    </PanelBody>
                    <PanelBody
                        title={__( 'Sort', 'gallery-styles' )}
                        initialOpen={false}>
                        <SelectControl
                            label={__( 'Order by', 'gallery-styles' )}
                            value={orderBy}
                            options={[
                                { label: __( 'As uploaded', 'gallery-styles' ), value: 'db' },
                                { label: _x( 'Media ID', 'sort criterion', 'gallery-styles' ), value: 'none' },
                                { label: __( 'File name', 'gallery-styles' ), value: 'name' },
                                { label: __( 'EXIF created', 'gallery-styles' ), value: 'exifCreated' },
                                { label: _x( 'WP Title', 'sort criterion', 'gallery-styles' ), value: 'title' },
                                { label: _x( 'WP date', 'sort criterion', 'gallery-styles' ), value: 'date' },
                                { label: _x( 'WP modified', 'sort criterion', 'gallery-styles' ), value: 'modified' },
                                // { label: __( 'Random', 'gallery-styles' ), value: 'random' },
                            ]}
                            onChange={(orderBy) => updateImages(sortOrder, orderBy)}
                            __nextHasNoMarginBottom
                        />
                        <ToggleControl
                            label={__( 'Sort order (asc)', 'gallery-styles' )}
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
