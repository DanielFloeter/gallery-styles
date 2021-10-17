/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
const {
    PanelColorSettings,
} = wp.blockEditor;
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';

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

        return (
            <>
                <InspectorControls>
                    <AdditionalColorPicker {...props} />
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
