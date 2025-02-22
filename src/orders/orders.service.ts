import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { Model, Types } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/Update-order.dto';
import { User } from 'src/user/Schemas/users.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  // user functions

  // Create a new order
  async create(createOrder: CreateOrderDto): Promise<Order> {
    return await this.orderModel.create(createOrder);
  }

  // Get orders by user ID
  async findByUserId(userId: string): Promise<Order[]> {
    return await this.orderModel
      .find({ userId })
      .populate({
        path: 'userId',
        select: '-password', // Exclude the password field
      })
      .populate('paymentId')
      .populate({
        path: 'items.productId', // Populate productId within items array
        model: 'Product',
      });
  }
  // get authenticated user orders by status
  // cancel order by user
  async findUserOrdersByStatus(
    userId: string,
    status: OrderStatus,
  ): Promise<Order[]> {
    return await this.orderModel
      .find({ userId, orderStatus: status })
      .populate({
        path: 'userId',
        select: '-password', // Exclude the password field
      })
      .populate('paymentId')
      .populate({
        path: 'items.productId', // Populate productId within items array
        model: 'Product', // Replace 'Product' with the actual model name for products
      });
  }

  // Get user active orders
  async findAllExceptCancelled(userId: string): Promise<Order[]> {
    return await this.orderModel
      .find({ userId, orderStatus: { $ne: OrderStatus.CANCELLED } })
      .populate({
        path: 'userId',
        select: '-password', // Exclude the password field
      })
      .populate('paymentId')
      .populate({
        path: 'items.productId', // Populate productId within items array
        model: 'Product', // Replace 'Product' with the actual model name for products
      })
      .exec();
  }

  // admin functions
  // Get all orders (for admin)
  async findAll(): Promise<Order[]> {
    return await this.orderModel
      .find()
      .populate({
        path: 'userId',
        select: '-password', // Exclude the password field
      })
      .populate('paymentId')
      .populate({
        path: 'items.productId', // Populate productId within items array
        model: 'Product', // Replace 'Product' with the actual model name for products
      })
      .exec();
  }
  // Get orders by status (for Admin)
  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return await this.orderModel
      .find({ orderStatus: status })
      .populate({
        path: 'userId',
        select: '-password', // Exclude the password field
      })
      .populate('paymentId')
      .populate({
        path: 'items.productId', // Populate productId within items array
        model: 'Product', // Replace 'Product' with the actual model name for products
      })
      .exec();
  }

  // for all
  // Get order by ID
  async findById(id: string): Promise<Order> {
    const order = await this.orderModel
      .findById(id)
      .populate({
        path: 'userId',
        select: '-password', // Exclude the password field
      })
      .populate('paymentId')
      .populate({
        path: 'items.productId', // Populate productId within items array
        model: 'Product', // Replace 'Product' with the actual model name for products
      })
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  // Update order by ID
  async updateById(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.orderModel
      .findByIdAndUpdate(id, updateOrderDto, {
        new: true,
      })
      .populate({
        path: 'userId',
        select: '-password', // Exclude the password field
      })
      .populate({
        path: 'items.productId', // Populate productId within items array
        model: 'Product', // Replace 'Product' with the actual model name for products
      })
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  // Delete order by ID
  async deleteById(id: string): Promise<Order> {
    const order = await this.orderModel
      .findByIdAndDelete(id)
      .populate({
        path: 'userId',
        select: '-password', // Exclude the password field
      })
      .populate({
        path: 'items.productId', // Populate productId within items array
        model: 'Product', // Replace 'Product' with the actual model name for products
      })
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  /////////////////////////

  // Update order status by ID (for Admin)
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    try {
      const order = await this.orderModel.findByIdAndUpdate(
        id,
        { orderStatus: status },
        { new: true }, // return the updated document
      );

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return order;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to update the status of the order with ID ${id}: ${error.message}`,
      );
    }
  }

  // Get recent orders
  async findRecent(limit: number = 10): Promise<Order[]> {
    return await this.orderModel
      .find()
      .sort({ orderDate: -1 })
      .limit(limit)
      .populate({
        path: 'userId',
        select: '-password', // Exclude the password field
      })
      .populate('paymentId')
      .exec();
  }

  // إضافة وظيفة إنشاء طلب للمسؤول
  async createOrderByAdmin(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      const newOrder = await this.orderModel.create(createOrderDto);
      return await newOrder.populate([
        {
          path: 'userId',
          select: '-password',
        },
        {
          path: 'paymentId',
        },
        {
          path: 'items.productId',
          model: 'Product',
        },
      ]);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create the order: ${error.message}`,
      );
    }
  }

  // إضافة وظيفة تحديث طلب للمسؤول
  async updateOrderByAdmin(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    try {
      const updatedOrder = await this.orderModel
        .findByIdAndUpdate(
          id,
          { $set: updateOrderDto },
          {
            new: true,
            runValidators: true,
          },
        )
        .populate([
          {
            path: 'userId',
            select: '-password',
          },
          {
            path: 'paymentId',
          },
          {
            path: 'items.productId',
            model: 'Product',
          },
        ]);

      if (!updatedOrder) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return updatedOrder;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to update the order: ${error.message}`,
      );
    }
  }

  async getSellerOrders(sellerId: string) {
    try {
      const orders = await this.orderModel
        .find()
        .populate({
          path: 'items.productId',
          match: { sellerId: new Types.ObjectId(sellerId) },
        })
        .populate('userId', 'name email')
        .exec();

      // Filter out orders that don't have any products for this seller
      const sellerOrders = orders
        .map((order) => {
          // Filter out null products (products that didn't match the seller)
          const sellerItems = order.items.filter(
            (item) =>
              item.productId &&
              (item.productId as any).sellerId?.toString() === sellerId,
          );

          if (sellerItems.length === 0) return null;

          // Calculate total price for seller's items only
          const sellerTotalPrice = sellerItems.reduce((total, item) => {
            const productPrice = (item.productId as any).price;
            return total + productPrice * item.quantity;
          }, 0);

          return {
            orderId: order._id,
            // orderDate: order.createdAt,
            customer: order.userId,
            items: sellerItems,
            orderStatus: order.orderStatus,
            sellerTotalPrice,
            shippingAddress: order.shippingAddress,
          };
        })
        .filter((order) => order !== null); // Remove orders with no matching products

      return sellerOrders;
    } catch (error) {
      throw new Error(`Error fetching seller orders: ${error.message}`);
    }
  }

  async getSellerOrderById(sellerId: string, orderId: string) {
    try {
      const order = await this.orderModel
        .findById(orderId)
        .populate({
          path: 'items.productId',
          match: { sellerId: new Types.ObjectId(sellerId) },
        })
        .populate('userId', 'name email')
        .exec();

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Filter out null products (products that didn't match the seller)
      const sellerItems = order.items.filter(
        (item) =>
          item.productId &&
          (item.productId as any).sellerId?.toString() === sellerId,
      );

      if (sellerItems.length === 0) {
        throw new NotFoundException(
          'No products found for this seller in this order',
        );
      }

      // Calculate total price for seller's items only
      const sellerTotalPrice = sellerItems.reduce((total, item) => {
        const productPrice = (item.productId as any).price;
        return total + productPrice * item.quantity;
      }, 0);

      return {
        orderId: order._id,
        // orderDate: order.createdAt,
        customer: order.userId,
        items: sellerItems,
        orderStatus: order.orderStatus,
        sellerTotalPrice,
        shippingAddress: order.shippingAddress,
      };
    } catch (error) {
      throw new Error(`Error fetching seller order: ${error.message}`);
    }
  }

  async getUserCompletedOrders(userId: string): Promise<Order[]> {
    try {
      return await this.orderModel
        .find({
          userId: userId,
          orderStatus: {
            $regex: new RegExp('^(completed|delivered)$', 'i'),
          },
        })
        .populate({
          path: 'items.productId',
          select: '_id name',
        })
        .lean()
        .exec();
    } catch (error) {
      throw new HttpException(
        `Error fetching completed orders: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
