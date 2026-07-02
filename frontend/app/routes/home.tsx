import type { Route } from './+types/home';
import {Navigation} from "../layouts/nav/navbar";


export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return(
      <>

<h1>Home</h1>



      </>
  )

}