
import {
    Avatar,
    Dropdown,
    DropdownDivider,
    DropdownHeader,
    DropdownItem,
    Navbar,
    NavbarBrand,
    NavbarCollapse,
    NavbarLink,
    NavbarToggle,
} from "flowbite-react";



    export function Navigation() {
        return (
            <Navbar fluid rounded className="bg-slate-100 border-b p-5">
                <NavbarBrand href="#" className={""}>
                    <img src='/coffee.svg' className="mr-3 h-6 sm:h-9" alt="coffee logo" />
                    <span className="self-center whitespace-nowrap text-2xl font-semibold ">BrewMatch</span>
                </NavbarBrand>
                <div className="flex md:order-2">
                    <Dropdown
                        arrowIcon={false}
                        inline
                        label={
                            <Avatar alt="User settings" img="https://flowbite.com/docs/images/people/profile-picture-5.jpg" rounded />
                        }
                    >
                        <DropdownHeader>
                            <span className="block text-sm">Bob Jolly</span>
                            <span className="block truncate text-sm font-medium">name@flowbite.com</span>
                        </DropdownHeader>
                        <DropdownItem>Dashboard</DropdownItem>
                        <DropdownItem>Settings</DropdownItem>
                        <DropdownItem>Earnings</DropdownItem>
                        <DropdownDivider />
                        <DropdownItem>Sign out</DropdownItem>
                    </Dropdown>
                    <NavbarToggle />
                </div>
                <NavbarCollapse>
                    <NavbarLink href="#" active>
                        <div className="flex items-center gap-1 md:hidden lg:flex">
                        <img src={'/home.svg'}  className={"h-5"}/>
                        <span>Home</span>
                        </div>
                    </NavbarLink>

                     <NavbarLink href="#">
                         <div className="flex items-center gap-1 md:hidden lg:flex">
                             <img src={'/search.svg'}  className={"h-5"}/>
                             <span className={"hidden lg:inline"}>Explore Cafes</span>
                         </div>
                         </NavbarLink>

                    <NavbarLink href="#">
                        <div className="flex items-center gap-1 md:hidden lg:flex">
                            <img src={'/save.svg'}  className={"h-5"}/>
                            <span>Saved Places</span>
                        </div>
                        </NavbarLink>

                    <NavbarLink href="#">
                        <div className="flex items-center gap-1 md:hidden lg:flex">
                            <img src={'/coffee.svg'}  className={"h-5"}/>
                            <span>Log a Visit</span>
                        </div>
                    </NavbarLink>

                    <NavbarLink href="#">
                        <div className="flex items-center gap-1 md:hidden lg:flex">
                            <img src={'/user.svg'}  className={"h-5"}/>
                            <span>My Profile</span>
                        </div>
                    </NavbarLink>
                </NavbarCollapse>
            </Navbar>
        );
    }