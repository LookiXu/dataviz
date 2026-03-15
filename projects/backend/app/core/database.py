"""
Prisma 数据库客户端
"""
from prisma import Prisma

# 全局 Prisma 客户端实例
prisma = Prisma()


async def connect_db():
    """连接数据库"""
    await prisma.connect()


async def disconnect_db():
    """断开数据库连接"""
    await prisma.disconnect()
