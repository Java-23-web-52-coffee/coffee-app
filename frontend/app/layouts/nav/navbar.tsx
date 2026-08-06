
import {
    Navbar,
    NavbarBrand,
    NavbarCollapse,
    NavbarLink,
    NavbarToggle,
} from "flowbite-react";
import {Outlet, useSubmit} from "react-router";
import {getSession} from "~/utils/session.server";
import type {Route} from "./+types/navbar";

// No redirect here — this layout wraps public pages too. It only checks
// whether anyone is signed in so the nav can show Sign Out vs Sign Up.
export async function loader({request}: Route.LoaderArgs) {
    const cookie = request.headers.get('Cookie')
    const session = await getSession(cookie)
    return {signedIn: Boolean(session.get('profile'))}
}

// Flowbite's Navbar switches from a hamburger menu to a full horizontal row
// at the `md` breakpoint (768px) by default. This nav's content (logo plus
// five links) doesn't actually fit on one row until ~1024px, so between
// those two widths the row wraps and the links drop below the logo.
// `clearTheme` wipes just the `md:`-based classes below, and `theme`
// supplies the same classes with `lg:` instead — same visual styling,
// switch-over point just moved past the squeeze zone.
const navbarBreakpointOverride = {
    theme: {
        collapse: {
            base: "w-full lg:block lg:w-auto",
            list: "mt-4 flex flex-col lg:mt-0 lg:flex-row lg:space-x-8 lg:text-sm lg:font-medium",
        },
        link: {
            base: "block py-2 pl-3 pr-4 lg:p-0",
            active: {
                on: "bg-primary-700 text-white lg:bg-transparent lg:text-primary-700 dark:text-white",
                off: "border-b border-gray-100 text-gray-700 hover:bg-gray-50 lg:border-0 lg:hover:bg-transparent lg:hover:text-primary-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent lg:dark:hover:text-white",
            },
        },
        toggle: {
            base: "inline-flex items-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 lg:hidden dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600",
        },
    },
    clearTheme: {
        collapse: {base: true, list: true},
        link: {base: true, active: {on: true, off: true}},
        toggle: {base: true},
    },
} as const;

    export default function Navigation({loaderData}: Route.ComponentProps) {
        const {signedIn} = loaderData;
        const submit = useSubmit();

        return (
            <>
            <Navbar fluid rounded className="bg-white  border-b border-b-gray-200" {...navbarBreakpointOverride}>
                <NavbarBrand href="#">
                    <img src='/coffee.svg' className="mr-3 h-6 sm:h-9" alt="coffee logo" />
                    <span className="self-center whitespace-nowrap text-2xl font-semibold ">BrewMatch</span>
                </NavbarBrand>
                <div className="flex md:order-2">
                    <NavbarToggle />
                </div>
                <NavbarCollapse>


                     <NavbarLink href="/search-page">
                         <div className="flex items-center gap-1  lg:flex">
                             <img src={'/search.svg'}  className={"h-5"}/>
                             <span className={" "}>Search Coffee Shops</span>
                         </div>
                         </NavbarLink>

                    <NavbarLink href="#">
                        <div className="flex items-center gap-1  lg:flex">
                            <img src={'/save.svg'}  className={"h-5"}/>
                            <span>Saved Places</span>
                        </div>
                        </NavbarLink>

                    <NavbarLink href="#">
                        <div className="flex items-center gap-1  lg:flex">
                            <img src={'/coffee.svg'}  className={"h-5"}/>
                            <span>Log a Visit</span>
                        </div>
                    </NavbarLink>

                    <NavbarLink href="#">
                        <div className="flex items-center gap-1  lg:flex">
                            <img src={'/user.svg'}  className={"h-5"}/>
                            <span>My Profile</span>
                        </div>
                    </NavbarLink>

                    {signedIn ? (
                        <NavbarLink
                            href="#"
                            onClick={(event) => {
                                event.preventDefault();
                                submit(null, {method: "post", action: "/sign-out"});
                            }}
                        >
                            <div className="flex items-center gap-1  lg:flex">
                                <img src={'/user.svg'}  className={"h-5"}/>
                                <span>Sign Out</span>
                            </div>
                        </NavbarLink>
                    ) : (
                        <NavbarLink href="/sign-up">
                            <div className="flex items-center gap-1  lg:flex">
                                <img src={'/user.svg'}  className={"h-5"}/>
                                <span>Sign Up</span>
                            </div>
                        </NavbarLink>
                    )}
                </NavbarCollapse>
            </Navbar>
                <Outlet />
            </>
        );
    }

