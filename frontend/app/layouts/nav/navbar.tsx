
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
// at the `md` breakpoint (768px) by default. That is too early for this nav:
// measured in the browser, the brand (213px) plus the link row (629px signed
// in, which is the wider case because "Sign Out" beats "Sign Up") plus 47px of
// container padding needs **889px** to sit on one row. Below that the row
// wraps and the links drop under the logo.
//
// `clearTheme` wipes just the `md:`-based classes below, and `theme` supplies
// the same classes with `lg:` (1024px) instead — same visual styling,
// switch-over point moved past the squeeze zone, with ~135px of slack.
//
// This was `xl:` (1280px) when the nav carried five links and needed ~1090px.
// Removing "Log a Visit" dropped the requirement to 889px, so `lg:` now gives
// the horizontal row to every screen from 1024px up instead of 1280px.
//
// Changing the links, the brand size or the type scale means re-measuring.
// The check is: brand width + link-row width + 47 <= breakpoint.
const navbarBreakpointOverride = {
    theme: {
        collapse: {
            base: "w-full lg:block lg:w-auto",
            list: "mt-4 flex flex-col text-lg lg:mt-0 lg:flex-row lg:space-x-6 lg:font-medium",
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
            <Navbar fluid rounded className="bg-white  border-b border-b-gray-200 py-5" {...navbarBreakpointOverride}>
                <NavbarBrand href="/">
                    <img src='/coffee.svg' className="mr-3 h-8 sm:h-11" alt="coffee logo" />
                    <span className="self-center whitespace-nowrap text-3xl font-semibold ">BrewMatch</span>
                </NavbarBrand>
                {/* No `order` override here. The collapse is `w-full` when open,
                    so giving the toggle a later order pushes it onto its own row
                    below the expanded menu instead of keeping it beside the brand.
                    With natural order, `justify-between` puts brand and toggle on
                    the first row and the menu wraps underneath. */}
                <div className="flex">
                    <NavbarToggle />
                </div>
                <NavbarCollapse>


                     <NavbarLink href="/search-page">
                         <div className="flex items-center gap-1  lg:flex">
                             <img src={'/search.svg'}  className={"h-6"}/>
                             <span className={" "}>Search Coffee Shops</span>
                         </div>
                         </NavbarLink>

                    <NavbarLink href="/saved">
                        <div className="flex items-center gap-1  lg:flex">
                            <img src={'/save.svg'}  className={"h-6"}/>
                            <span>Saved Places</span>
                        </div>
                        </NavbarLink>

                    <NavbarLink href="/preferences">
                        <div className="flex items-center gap-1  lg:flex">
                            <img src={'/user.svg'}  className={"h-6"}/>
                            <span>Preferences</span>
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
                                <img src={'/user.svg'}  className={"h-6"}/>
                                <span>Sign Out</span>
                            </div>
                        </NavbarLink>
                    ) : (
                        <NavbarLink href="/sign-up">
                            <div className="flex items-center gap-1  lg:flex">
                                <img src={'/user.svg'}  className={"h-6"}/>
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

