import style from "../../styles/CustomSlider.module.css"
import selectedStyle from "../../styles/SelectedSlider.module.css"
import { play } from "../../../electron/utils/sound.js";

interface Props {
    title: string;
    min: string | number;
    max: string | number;
    step: string | number;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    selected: boolean;
}

function CustomSlider(props: Props) {
    console.log('selected:', props.selected, 'class:', props.selected ? 'selectedStyle' : 'baseStyle');
    const percent = Math.round(props.value * 100) + "%";

    return (
        <div className={style.sliderRow}>
            <label className={style.containerLabelAlt}>
                {props.title}
            </label>
            <input
                type="range"
                min={props.min}
                max={props.max}
                step={props.step}
                value={props.value}
                onMouseOver={() => play("hover")}
                onChange={(e) => {
                    props.onChange(e);
                    play('rollover');
                }}
                className={props.selected ? selectedStyle.containerSlider : style.containerSlider}
            />
            <span className={style.percentLabel}>
                {percent}
            </span>
        </div>
    );
}

export default CustomSlider;