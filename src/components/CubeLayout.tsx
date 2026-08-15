import style from '/src/styles/CubeLayout.module.css'

interface Props {
    width: string;
    height: string;
    children: React.ReactNode;
}

function CubeLayout(props: Props) {
    return (
        <div style={{ width: props.width, height: props.height }} className={style.layout}>
            {props.children}
        </div>
    )
}

export default CubeLayout