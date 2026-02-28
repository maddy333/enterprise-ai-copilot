import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.db.models.models import Base
from app.core.security import get_password_hash
from app.db.models.models import User
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db() -> None:
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True)
    async with engine.begin() as conn:
        logger.info("Creating all tables in the database...")
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        # Create an admin user if it doesn't exist
        from sqlalchemy.future import select
        result = await session.execute(select(User).where(User.email == "admin@startup.local"))
        user = result.scalars().first()
        if not user:
            logger.info("Creating root admin user...")
            admin_user = User(
                email="admin@startup.local",
                hashed_password=get_password_hash("admin123"), # Hardcoded for demo/setup
                full_name="System Administrator",
                role="admin",
                is_active=True
            )
            session.add(admin_user)
            await session.commit()
            
    await engine.dispose()
    logger.info("Database initialized successfully.")

def main() -> None:
    asyncio.run(init_db())

if __name__ == "__main__":
    main()
