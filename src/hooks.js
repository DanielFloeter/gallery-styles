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
import {
    LINK_DESTINATION_LIGHTBOX,
    getHrefAndDestination,
    hasLightboxSupport,
    matchesLinkDestination,
    normalizeLinkDestination
} from './link-utils';
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
        const { sortOrder, orderBy, disableCaption, blendMode, textBlendMode, fontSize, innerBlockImagesDB, linkTo, linkToAppliedIds } = attributes;
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
            updateBlockAttributes,
        } = useDispatch(blockEditorStore);

        /**
         * Issue #10: default link destination.
         *
         * Changing the link destination stays the job of the "Link" dropdown
         * in the block toolbar of core/gallery. What core does not do is apply
         * a default to a freshly inserted gallery - depending on the version
         * the `linkTo` attribute is missing or its default is ignored - so the
         * plugin writes `href`, `linkDestination` and the lightbox attribute
         * to the images of a new gallery itself.
         */
        const imageIds = (innerBlockImages ?? [])
            .map((block) => block?.attributes?.id)
            .filter((id) => !!id);

        const imageData = useSelect(
            (select) => {
                const core = select('core');
                // `getMedia` is deprecated since WordPress 6.9, the attachment
                // entity is the replacement and exists since WordPress 5.9.
                const getAttachment =
                    typeof core.getEntityRecord === 'function'
                        ? (id) => core.getEntityRecord('postType', 'attachment', id)
                        : (id) => core.getMedia(id);
                return imageIds.map((id) => getAttachment(id));
            },
            [imageIds.join(',')]
        );

        // Only WordPress versions with a lightbox get a default from this
        // plugin. Without one there is nothing sensible to preselect, so the
        // gallery keeps whatever core does on its own.
        const lightboxSupported = hasLightboxSupport();

        // The link destination the gallery currently carries.
        const linkDestination = normalizeLinkDestination(linkTo);

        // Existing content is never touched: only a gallery that was inserted
        // empty in this editor session gets the default link destination
        // written to its images.
        const isNewGallery = useRef(null);
        if (isNewGallery.current === null) {
            isNewGallery.current = (innerBlockImages ?? []).length === 0;
        }

        function getMediaById(id) {
            return imageData?.find((media) => media?.id === id);
        }

        function applyLinkTo(destination, blocks = innerBlockImages) {
            const changed = {};

            (blocks ?? []).forEach((block) => {
                const attributes = getHrefAndDestination(
                    getMediaById(block.attributes.id),
                    destination,
                    block.attributes
                );
                changed[block.clientId] = attributes;
                updateBlockAttributes(block.clientId, attributes);
            });

            // Keep the "As uploaded" snapshot in sync, otherwise switching the
            // sort order back to 'db' would restore the old link attributes.
            if (innerBlockImagesDB?.length) {
                setAttributes({
                    innerBlockImagesDB: innerBlockImagesDB.map((block) =>
                        changed[block.clientId]
                            ? {
                                  ...block,
                                  attributes: {
                                      ...block.attributes,
                                      ...changed[block.clientId],
                                  },
                              }
                            : block
                    ),
                });
            }
        }

        // Images the gallery link destination has not been written to yet:
        // a newly inserted gallery, or images added to an existing one.
        const pendingBlocks = (innerBlockImages ?? []).filter(
            (block) =>
                block?.attributes?.id &&
                !(linkToAppliedIds ?? []).includes(block.attributes.id)
        );
        const pendingResolved =
            pendingBlocks.length > 0 &&
            pendingBlocks.every((block) => !!getMediaById(block.attributes.id));

        useEffect(() => {
            if (!lightboxSupported || !isNewGallery.current || !pendingResolved) {
                return;
            }
            // The first images of a new gallery get "Expand on click", later
            // ones follow whatever the gallery is set to by then.
            const firstRun = (linkToAppliedIds ?? []).length === 0;
            const destination = firstRun
                ? LINK_DESTINATION_LIGHTBOX
                : linkDestination;

            const outdated = pendingBlocks.filter(
                (block) => !matchesLinkDestination(block.attributes, destination)
            );
            if (outdated.length) {
                applyLinkTo(destination, outdated);
            }
            setAttributes({
                linkTo: destination,
                linkToAppliedIds: [
                    ...new Set([...(linkToAppliedIds ?? []), ...imageIds]),
                ],
            });
        }, [lightboxSupported, pendingResolved, pendingBlocks.length, linkDestination]);


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
