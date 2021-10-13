/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
    PanelBody,
    ColorPalette
} from '@wordpress/components';
import {
    useState,
    useEffect
} from '@wordpress/element';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';

const CreateNewPostLink = () => {
    const [color, setColor] = useState('#f00');
    const colors = wp.data.select("core/editor").getEditorSettings().colors.filter(
        word => word['origin'] !== 'core'
    );

    const OnChangeColor = (color) => {
        setColor(color);

        // Accessing scss variable "--line-color"
        // using plain JavaScript
        const root = document.documentElement;
        root?.style.setProperty("--line-color", color);
    }

    return (
        <ColorPalette
            colors={colors}
            value={color}
            onChange={OnChangeColor}
        />
    );
};

/**
 * Override the default edit UI to include layout controls
 *
 * @param {Function} BlockEdit Original component
 * @return {Function}           Wrapped component
 */
const queryTopInspectorControls = createHigherOrderComponent(
    (BlockEdit) => (props) => {
        const { name, isSelected } = props;
        if (name !== 'core/gallery' || !isSelected) {
            return <BlockEdit key="edit" {...props} />;
        }

        return (
            <>
                <InspectorControls>
                    <PanelBody title={__('Line color')}>
                        <CreateNewPostLink {...props} />
                    </PanelBody>
                </InspectorControls>
                <BlockEdit key="edit" {...props} />
            </>
        );
    },
    'withInspectorControls'
);

export default queryTopInspectorControls;
