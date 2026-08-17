import CubeLayout from "../components/CubeLayout";
import CustomSlider from "../components/OptionsPageComponents/CustomSlider";
import CancelButton from "../components/Buttons/CancelButton";
import OptionsStyle from "../styles/Options.module.css";
import CubeLayoutStyle from "../styles/CubeLayout.module.css";
import { preload, play } from "../utils/sound.js";
import { on, off, BUTTONS } from '../utils/gamepad';
// aliased: this file already has local `brightness`/`volume` state variables
import { brightness as brightnessApi, volume as volumeApi } from "../platform";

import { useState, useEffect, useMemo, useRef } from "react";
import { debounce } from "lodash";

const SLIDERS = ['brightness', 'volume'];

function Options() {
    const [brightness, setBrightnessState] = useState(1.0);
    const [volume, setVolumeState] = useState(1.0);
    const [selectedSlider, setSelectedSlider] = useState(0);

    const brightnessRef = useRef(1.0);
    const volumeRef = useRef(1.0);
    const selectedSliderRef = useRef(0);

    useEffect(() => {
        // Preload sounds
        preload("rollover");

        brightnessApi.get().then(v => {
            setBrightnessState(v);
            brightnessRef.current = v;
        });
        volumeApi.get().then(v => {
            setVolumeState(v);
            volumeRef.current = v;
        });
    }, []);


    // Debounced brightness setter
    const debouncedSetBrightness = useMemo(() =>
        debounce((value: number) => brightnessApi.set(value), 100)
    , []);

    // Debounced volume setter
    const debouncedSetVolume = useMemo(() =>
        debounce((value: number) => volumeApi.set(value), 100)
    , []);
    
    // Cleanup debounces on unmount
    useEffect(() => {
        return () => {
            debouncedSetBrightness.cancel();
            debouncedSetVolume.cancel();
        };
    }, [debouncedSetBrightness, debouncedSetVolume]);

    const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setBrightnessState(value);
        brightnessRef.current = value;
        debouncedSetBrightness(value);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setVolumeState(value);
        volumeRef.current = value;
        debouncedSetVolume(value);
    };

    useEffect(() => {
        preload("rollover");
        const handleUp = () => {
            const next = Math.max(0, selectedSliderRef.current - 1);
            selectedSliderRef.current = next;
            setSelectedSlider(next);
            play("rollover");
        };

        const handleDown = () => {
            const next = Math.min(SLIDERS.length - 1, selectedSliderRef.current + 1);
            selectedSliderRef.current = next;
            setSelectedSlider(next);
            play("rollover");
        };

        const handleLeft = () => {
            const slider = SLIDERS[selectedSliderRef.current];
            if (slider === 'brightness') {
                const next = Math.max(0.1, parseFloat((brightnessRef.current - 0.1).toFixed(1)));
                brightnessRef.current = next;
                setBrightnessState(next);
                debouncedSetBrightness(next);
            } else {
                const next = Math.max(0.0, parseFloat((volumeRef.current - 0.1).toFixed(1)));
                volumeRef.current = next;
                setVolumeState(next);
                debouncedSetVolume(next);
            }
            play("rollover");
        };

        const handleRight = () => {
            const slider = SLIDERS[selectedSliderRef.current];
            if (slider === 'brightness') {
                const next = Math.min(1.0, parseFloat((brightnessRef.current + 0.1).toFixed(1)));
                brightnessRef.current = next;
                setBrightnessState(next);
                debouncedSetBrightness(next);
            } else {
                const next = Math.min(1.0, parseFloat((volumeRef.current + 0.1).toFixed(1)));
                volumeRef.current = next;
                setVolumeState(next);
                debouncedSetVolume(next);
            }
            play("rollover");
        };

        on(BUTTONS.DPAD_UP, handleUp);
        on(BUTTONS.DPAD_DOWN, handleDown);
        on(BUTTONS.DPAD_LEFT, handleLeft);
        on(BUTTONS.DPAD_RIGHT, handleRight);

        return () => {
            off(BUTTONS.DPAD_UP, handleUp);
            off(BUTTONS.DPAD_DOWN, handleDown);
            off(BUTTONS.DPAD_LEFT, handleLeft);
            off(BUTTONS.DPAD_RIGHT, handleRight);
        };
    }, []);

    return (

        <CubeLayout width="640px" height="640px">
            <div className={OptionsStyle.container}>
                <CustomSlider 
                    title="Brightness: " 
                    min="0.1" 
                    max="1.0" 
                    step="0.1" 
                    value={brightness} 
                    onChange={handleBrightnessChange}
                    selected={selectedSlider === 0} />

                <CustomSlider 
                    title="Volume:" 
                    min="0.0" 
                    max="1.0" 
                    step="0.1" 
                    value={volume} 
                    onChange={handleVolumeChange}
                    selected={selectedSlider === 1} />
            </div>
            <CancelButton dst="/" />
            <div className={CubeLayoutStyle.bottomLeft}>
                <p>Press Up/Down to Switch between Sliders</p>
                <p>Press Left/Right to Adjust Values</p>
                <p>Press B to Return to Main Menu</p>
            </div>
        </CubeLayout>
    )
}

export default Options