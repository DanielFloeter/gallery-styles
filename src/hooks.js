/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { createHigherOrderComponent } from '@wordpress/compose';
import {
    store as blockEditorStore,
    InspectorControls 
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { 
    PanelBody,
    ToggleControl
} from '@wordpress/components';
const {
    PanelColorSettings,
} = wp.blockEditor;

const AdditionalColorPicker = (props) => {
    const { attributes, setAttributes } = props;
    const { color } = attributes;

    const colors = wp.data.select("core/editor").getEditorSettings().colors.filter(
        word => word['origin'] !== 'core'
    );

    const OnChangeColor = (color) => {
        setAttributes({ color });
    }

    return (
        <PanelColorSettings
            title="Line Color"
            colors={colors}
            colorSettings={[
                {
                    label: __('Color'),
                    value: color,
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

        const { name } = props;
        if (name !== 'core/gallery') {
            return <BlockEdit key="edit" {...props} />;
        }

        const {
            clientId
        } = props;

        const innerBlockImages = useSelect(
            ( select ) => {
                return select( blockEditorStore ).getBlock( clientId )?.innerBlocks;
            },
            [ clientId ]
        );

        const [ hasFixedBackground, setHasFixedBackground ] = useState( false );

        const {
            replaceInnerBlocks,
        } = useDispatch( blockEditorStore );

        function updateImages( state ) {
            replaceInnerBlocks(
                clientId,
                innerBlockImages
                    .sort(
                        ( a, b ) =>
                            //a.attributes.url.split('/').pop() - b.attributes.url.split('/').pop()
                            //a.attributes.id - b.attributes.id
                        {
                            //wp.data.select( 'core' ).getMedia( a.attributes.id ).title.rendered;
                            wp.data.select( 'core' ).getMedia( b.attributes.id ).slug;
                            wp.data.select( 'core' ).getMedia( b.attributes.id ).date;
                            wp.data.select( 'core' ).getMedia( b.attributes.id ).modified;

                            if (a.attributes.url.split('/').pop() < b.attributes.url.split('/').pop()) {
                                return state ? -1 : 1;
                            }
                            if (a.attributes.url.split('/').pop() > b.attributes.url.split('/').pop()) {
                                return state ? 1 : -1;
                            }

                            // names must be equal
                            return 0;
                        }
                    )
            );
            return ! state;
        }

        return (
            <>
                <InspectorControls>
                    <AdditionalColorPicker {...props} />
                    <PanelBody title={ __( 'Sort' ) }>
                    <ToggleControl
                        label = "Name"
                        checked={ hasFixedBackground }
                        onChange={ () => {
                            setHasFixedBackground( updateImages );
                        } }
                        />
                    </PanelBody>
                </InspectorControls>
                <div style={{ '--line-color': props.attributes.color }}>
                    <BlockEdit key="edit" {...props} />
                </div>
            </>
        );
    },
    'withInspectorControls'
);

export default editInspectorControls;
