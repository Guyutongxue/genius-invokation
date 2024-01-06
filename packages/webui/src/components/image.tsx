import { type JSX } from "preact";

type DivProps = JSX.IntrinsicElements["div"] ;

export interface ImageProps extends DivProps {
  imageId: number;
}

export function Image({ imageId, ...props}: ImageProps) {
  return <div class={props.class}></div>;
}
