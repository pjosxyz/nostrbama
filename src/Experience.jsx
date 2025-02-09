import { Physics } from "@react-three/rapier";
import Lights from "./Lights";
import Logo from "./Logo";
import Player from "./Player";
import Level from "./Level";

export default function Experience() {
  return (
    <>
      <color args={["rebeccapurple"]} attach="background" />
      <Physics debug>
        <Lights />
        <Player />
        <Logo />
        <Level />
      </Physics>
    </>
  );
}
