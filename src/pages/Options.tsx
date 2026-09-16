import CubeLayout from "../components/CubeLayout";
import CustomSlider from "../components/OptionsPageComponents/CustomSlider";
import CancelButton from "../components/Buttons/CancelButton";
import OptionsStyle from "../styles/Options.module.css";
import CubeLayoutStyle from "../styles/CubeLayout.module.css";
import { preload, play, setVolume as setSoundVolume } from "../utils/sound.js";
import { on, off, BUTTONS } from '../utils/gamepad';
import { volume as volumeApi } from "../platform";

import { useState, useEffect, useMemo, useRef } from "react";
import { debounce } from "lodash";

function Options() {
    const [volume, setVolumeState] = useState(1.0);

    const volumeRef = useRef(1.0);

    useEffect(() => {
        // Preload sounds
        preload("rollover");

        volumeApi.get().then(v => {
            setVolumeState(v);
            volumeRef.current = v;
            setSoundVolume(v);
        });
    }, []);

    // Debounced volume setter
    const debouncedSetVolume = useMemo(() =>
        debounce((value: number) => volumeApi.set(value), 100)
    , []);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            debouncedSetVolume.cancel();
        };
    }, [debouncedSetVolume]);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setVolumeState(value);
        volumeRef.current = value;
        setSoundVolume(value);
        debouncedSetVolume(value);
    };

    useEffect(() => {
        preload("rollover");

        const handleLeft = () => {
            const next = Math.max(0.0, parseFloat((volumeRef.current - 0.1).toFixed(1)));
            volumeRef.current = next;
            setVolumeState(next);
            setSoundVolume(next);
            debouncedSetVolume(next);
            play("rollover");
        };

        const handleRight = () => {
            const next = Math.min(1.0, parseFloat((volumeRef.current + 0.1).toFixed(1)));
            volumeRef.current = next;
            setVolumeState(next);
            setSoundVolume(next);
            debouncedSetVolume(next);
            play("rollover");
        };

        on(BUTTONS.DPAD_LEFT, handleLeft);
        on(BUTTONS.DPAD_RIGHT, handleRight);

        return () => {
            off(BUTTONS.DPAD_LEFT, handleLeft);
            off(BUTTONS.DPAD_RIGHT, handleRight);
        };
    }, []);

    return (

        <CubeLayout width="640px" height="640px">
            <div className={OptionsStyle.container}>
                <CustomSlider
                    title="Volume:"
                    min="0.0"
                    max="1.0"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    selected={true} />
            </div>
            <CancelButton dst="/" />
            <div className={CubeLayoutStyle.bottomLeft}>
                <p>Press Left/Right to Adjust Volume</p>
                <p>Press B to Return to Main Menu</p>
            </div>
        </CubeLayout>
    )
}

export default Options
