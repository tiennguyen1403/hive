import {
  type Address,
  type AddressLabel,
  type Customer,
  addressId,
  customerId,
} from "./types";

/**
 * Simulated. These people do not exist; the names come from the approved
 * prototype and are here so the admin screens have rows and the account
 * screens have someone to be signed in as. Any admin view built on this data
 * has to say "dữ liệu mô phỏng" — PRODUCT.md is explicit that the project has
 * no real customers and none may be invented into looking real.
 */

/**
 * `label` is what the shopper calls the place, and it is a FIELD rather than
 * something the screens assume: before v3 slice 3 every seeded address was
 * shown as "Nhà", so an account with two of them read "Nhà · Trần Minh Anh"
 * twice and the picker offered no way to tell them apart.
 */
const addr = (
  id: string,
  recipient: string,
  phone: string,
  line: string,
  provinceCode: string,
  wardCode: string,
  label: AddressLabel = "Nhà",
  isDefault = false,
): Address => ({
  id: addressId(id),
  recipient,
  phone,
  line,
  provinceCode,
  wardCode,
  label,
  isDefault,
});

export const CUSTOMERS: Customer[] = [
  {
    id: customerId("c-minhanh"),
    name: "Trần Minh Anh",
    email: "minhanh@email.com",
    phone: "0912 345 678",
    joinedAt: "2026-03-08T21:14:00+07:00",
    addresses: [
      addr("a-minhanh-1", "Trần Minh Anh", "0912 345 678",
        "24 Nguyễn Thị Minh Khai", "29", "70101063", "Nhà", true),
      addr("a-minhanh-2", "Trần Minh Anh", "0912 345 678",
        "155/3 Lê Văn Thọ", "29", "70125111", "Công ty"),
    ],
  },
  {
    id: customerId("c-namle"),
    name: "Lê Hoàng Nam",
    email: "nam.le@email.com",
    phone: "0908 221 447",
    joinedAt: "2026-03-09T09:02:00+07:00",
    addresses: [
      addr("a-namle-1", "Lê Hoàng Nam", "0908 221 447",
        "88 Xuân Thuỷ", "01", "10113025", "Nhà", true),
    ],
  },
  {
    id: customerId("c-hapham"),
    name: "Phạm Thu Hà",
    email: "ha.pham@email.com",
    phone: "0931 776 205",
    joinedAt: "2026-06-06T20:41:00+07:00",
    addresses: [
      addr("a-hapham-1", "Phạm Thu Hà", "0931 776 205",
        "12 Nguyễn Văn Linh", "21", "50101001", "Nhà", true),
    ],
  },
  {
    id: customerId("c-duyvo"),
    name: "Võ Đức Duy",
    email: "duy.vo@email.com",
    phone: "0977 310 892",
    joinedAt: "2026-06-07T13:25:00+07:00",
    addresses: [
      addr("a-duyvo-1", "Võ Đức Duy", "0977 310 892",
        "40/7 Phan Đăng Lưu", "29", "70129105", "Nhà", true),
    ],
  },
  {
    id: customerId("c-vynguyen"),
    name: "Nguyễn Khả Vy",
    email: "vy.nguyen@email.com",
    phone: "0356 448 130",
    joinedAt: "2026-09-11T20:06:00+07:00",
    addresses: [
      addr("a-vynguyen-1", "Nguyễn Khả Vy", "0356 448 130",
        "9 Trần Phú", "23", "51101001", "Nhà", true),
    ],
  },
  {
    id: customerId("c-baodang"),
    name: "Đặng Quốc Bảo",
    email: "bao.dang@email.com",
    phone: "0869 502 714",
    joinedAt: "2026-09-12T08:18:00+07:00",
    addresses: [
      addr("a-baodang-1", "Đặng Quốc Bảo", "0869 502 714",
        "31 Đại lộ Bình Dương", "29", "71101038", "Nhà", true),
    ],
  },
  {
    id: customerId("c-tubui"),
    name: "Bùi Thanh Tú",
    email: "tu.bui@email.com",
    phone: "0794 116 380",
    joinedAt: "2026-09-13T22:47:00+07:00",
    addresses: [
      addr("a-tubui-1", "Bùi Thanh Tú", "0794 116 380",
        "207 Nguyễn Văn Cừ", "33", "81519001", "Nhà", true),
    ],
  },
  {
    id: customerId("c-linhhoang"),
    name: "Hoàng Mỹ Linh",
    email: "linh.hoang@email.com",
    phone: "0385 907 264",
    joinedAt: "2026-09-15T19:33:00+07:00",
    addresses: [
      addr("a-linhhoang-1", "Hoàng Mỹ Linh", "0385 907 264",
        "6 Lê Đại Hành", "01", "10111023", "Nhà", true),
    ],
  },
];

export const customerById = new Map(CUSTOMERS.map((c) => [c.id, c]));

/** Whoever the mock treats as signed in on the account screens. */
export const SIGNED_IN_CUSTOMER = CUSTOMERS[0]!;
