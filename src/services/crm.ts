import { db } from "@/lib/db";

export const CustomerService = {
  async getCustomers(filters: { search?: string; isActive?: boolean }) {
    const where: any = {};
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
        { contact: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    return db.customer.findMany({
      where,
      include: { salesOrders: { select: { id: true, soNumber: true, grandTotal: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getCustomer(id: string) {
    return db.customer.findUnique({
      where: { id },
      include: {
        salesOrders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { items: { include: { product: true } } },
        },
      },
    });
  },

  async createCustomer(data: any) {
    return db.customer.create({
      data: {
        code: data.code,
        name: data.name,
        contact: data.contact,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        country: data.country,
        taxNumber: data.taxNumber,
        creditLimit: data.creditLimit || 0,
        paymentTerms: data.paymentTerms || 30,
        isActive: data.isActive ?? true,
      },
    });
  },

  async updateCustomer(id: string, data: any) {
    return db.customer.update({
      where: { id },
      data,
    });
  },

  async deleteCustomer(id: string) {
    return db.customer.delete({ where: { id } });
  },

  async getCustomerStats(id: string) {
    const orders = await db.salesOrder.findMany({
      where: { customerId: id },
      select: { grandTotal: true, status: true },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalOrders, totalRevenue, avgOrderValue };
  },
};

export const SupplierService = {
  async getSuppliers(filters: { search?: string; isActive?: boolean }) {
    const where: any = {};
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
        { contact: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    return db.supplier.findMany({
      where,
      include: { purchaseOrders: { select: { id: true, poNumber: true, grandTotal: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getSupplier(id: string) {
    return db.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { items: true },
        },
        inventoryItems: true,
        purchasePriceList: { include: { product: true } },
      },
    });
  },

  async createSupplier(data: any) {
    return db.supplier.create({
      data: {
        code: data.code,
        name: data.name,
        contact: data.contact,
        phone: data.phone,
        email: data.email,
        address: data.address,
        taxNumber: data.taxNumber,
        paymentTerms: data.paymentTerms || 30,
        isActive: data.isActive ?? true,
      },
    });
  },

  async updateSupplier(id: string, data: any) {
    return db.supplier.update({
      where: { id },
      data,
    });
  },

  async deleteSupplier(id: string) {
    return db.supplier.delete({ where: { id } });
  },

  async getSupplierStats(id: string) {
    const orders = await db.purchaseOrder.findMany({
      where: { supplierId: id },
      select: { grandTotal: true, expectedDate: true, receivedDate: true },
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const leadTimes = orders
      .filter((o) => o.expectedDate && o.receivedDate)
      .map((o) => Math.ceil((o.receivedDate!.getTime() - o.expectedDate!.getTime()) / (1000 * 60 * 60 * 24)));
    const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((s, l) => s + l, 0) / leadTimes.length : 0;

    return { totalOrders, totalSpent, avgLeadTime };
  },
};
