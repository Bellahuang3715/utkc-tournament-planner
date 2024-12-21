import React, { useState } from "react";
import { Navbar, Nav, Button, Offcanvas, Image } from "react-bootstrap";
import { FaCog, FaBell, FaBars, FaListAlt, FaSignOutAlt } from "react-icons/fa";
import { AiOutlineClose, AiFillHome, AiOutlineUsergroupAdd, AiFillDatabase, AiOutlineShoppingCart } from "react-icons/ai";
import Link from 'next/link';

interface User {
  name: string;
  email: string;
  profilePicture: string;
}

const NavBar: React.FC = () => {
  const [show, setShow] = useState<boolean>(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const user: User = {
    name: "John Smith",
    email: "john.smith@test.com",
    profilePicture:
      "https://www.shutterstock.com/image-vector/cute-stingray-fish-swimming-cartoon-600nw-2249999415.jpg",
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <Navbar className="top-navbar">
        <Button
          className="sidebar-hamburger border-0 ms-3"
          onClick={handleShow}
        >
          <FaBars size={24} />
        </Button>

        <Link href="/" passHref>
          <Navbar.Brand className="ms-3">Tourney</Navbar.Brand>
        </Link>

        <Nav className="ms-auto me-4">
          <Nav.Link href="#notifications">
            <FaBell size={20} />
          </Nav.Link>
        </Nav>
      </Navbar>

      {/* Sidebar Offcanvas */}
      <Offcanvas show={show} onHide={handleClose}>
        <Offcanvas.Header className="sidebar">
          {/* User Profile */}
          <div className="d-flex align-items-center w-100">
            <Image
              src={user.profilePicture}
              roundedCircle
              width={50}
              height={50}
              alt="User Profile"
              className="me-3"
            />
            <div>
              <h6 className="mb-0">{user.name}</h6>
              <p className="mb-0">{user.email}</p>
            </div>
            <Button variant="link" className="ms-auto" onClick={handleClose}>
              <AiOutlineClose size={24} />
            </Button>
          </div>
        </Offcanvas.Header>

        <hr className="m-0" />

        <Offcanvas.Body
          className="sidebar d-flex flex-column"
          style={{ height: "100%" }}
        >
          <Nav className="flex-grow-1 flex-column">
            <Nav.Link href="/" className="sidebar-item">
              <AiFillHome size={20} className="sidebar-icon" />
              Home
            </Nav.Link>
            <Nav.Link href="/members" className="sidebar-item">
              <AiOutlineUsergroupAdd size={20} className="sidebar-icon" />
              Members
            </Nav.Link>
            <Nav.Link href="/inventory" className="sidebar-item">
              <AiFillDatabase size={20} className="sidebar-icon" />
              Inventory
            </Nav.Link>
            <Nav.Link href="/" className="sidebar-item">
              <FaListAlt size={20} className="sidebar-icon" />
              Tournaments
            </Nav.Link>
            <Nav.Link href="/" className="sidebar-item">
              <FaListAlt size={20} className="sidebar-icon" />
              Events
            </Nav.Link>
            <Nav.Link href="/orders" className="sidebar-item">
              <AiOutlineShoppingCart size={20} className="sidebar-icon" />
              Group Orders
            </Nav.Link>
            <Nav.Link href="/" className="sidebar-item">
              <FaCog size={20} className="sidebar-icon" />
              Settings
            </Nav.Link>
          </Nav>

          <hr className="m-3" />

          <Nav className="flex-column">
            <Nav.Link href="/" className="sidebar-item">
              <FaSignOutAlt size={20} className="sidebar-icon" />
              Logout
            </Nav.Link>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default NavBar;
