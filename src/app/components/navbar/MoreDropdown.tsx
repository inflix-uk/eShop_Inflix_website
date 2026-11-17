"use client";
import { useState } from "react";
import Link from "next/link";
import type { NavbarItem } from "@/app/lib/features/navbarcategories/navbarTypes";
import { isNavbarCustom } from "@/app/lib/features/navbarcategories/navbarTypes";

interface MoreDropdownProps {
  items: NavbarItem[];
}

const MoreDropdown: React.FC<MoreDropdownProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li
      className="relative dropdown"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="flex cursor-pointer hover:text-gray-200 mt-0.5 items-center">
        <span>More</span>
        <svg
          style={{ height: "30px", width: "30px" }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="m12 15l-4.243-4.242l1.415-1.414L12 12.172l2.828-2.828l1.415 1.414z"
          />
        </svg>
      </div>
      {isOpen && (
        <ul className="absolute dropdown-menu left-0 top-full z-50 mt-0 min-w-48 space-y-2 rounded bg-white py-2 pt-2 text-black shadow-lg">
          {items.map((item) => {
            if (isNavbarCustom(item)) {
              const external = /^https?:\/\//i.test(item.path.trim());
              return (
                <li key={item._id}>
                  {external ? (
                    <a
                      href={item.path.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 hover:bg-gray-200"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.path.trim()}>
                      <p className="px-4 py-2 hover:bg-gray-200">{item.label}</p>
                    </Link>
                  )}
                </li>
              );
            }

            const validSubCategories = item.subCategory.filter(
              (subCat) => subCat.trim() !== ""
            );

            return (
              <li className="relative group dropdown" key={item._id}>
                <Link href={`/categories/${encodeURIComponent(item.name.toLowerCase())}`}>
                  <p className="px-4 py-2 hover:bg-gray-200 flex justify-between items-center">
                    {item.name.replace(/-/g, " ")}
                    {validSubCategories.length > 0 && (
                      <svg
                        style={{
                          height: "20px",
                          width: "20px",
                          marginLeft: "5px",
                        }}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="m12 15l-4.243-4.242l1.415-1.414L12 12.172l2.828-2.828l1.415 1.414z"
                        />
                      </svg>
                    )}
                  </p>
                </Link>

                {validSubCategories.length > 0 && (
                  <ul className="absolute top-0 right-full z-50 mt-0 hidden min-w-48 space-y-2 rounded bg-white py-2 pl-2 text-black shadow-lg group-hover:block -ml-2">
                    {validSubCategories.map((subCat, index) => (
                      <li key={index}>
                        <Link
                          href={`/categories/${encodeURIComponent(item.name.toLowerCase())}/${encodeURIComponent(subCat.toLowerCase())}`}
                        >
                          <p className="block px-4 py-2 hover:bg-gray-200">
                            {subCat.replace(/-/g, " ")}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};

export default MoreDropdown;
