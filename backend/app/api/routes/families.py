from uuid import UUID
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func, or_

from app.api.deps import DbSession, CurrentUser
from app.models.family import Family, FamilyMember, FamilyInvite, generate_invite_code
from app.models.user import User
from app.models.recipe import Recipe
from app.models.collection import Collection
from app.models.meal_plan import MealPlan
from app.models.shopping_list import ShoppingList
from app.schemas.family import (
    FamilyCreate,
    FamilyUpdate,
    FamilyResponse,
    FamilyListResponse,
    FamilyMemberResponse,
    FamilyInviteCreate,
    FamilyInviteResponse,
    PendingInvitesResponse,
    JoinFamilyResponse,
)

router = APIRouter()


async def get_user_family_ids(db: DbSession, user_id: UUID) -> list[UUID]:
    """Get all family IDs the user belongs to."""
    result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == user_id)
    )
    return [row[0] for row in result]


async def family_to_response(
    family: Family, db: DbSession, include_members: bool = True
) -> FamilyResponse:
    """Convert Family model to response with member details."""
    members = []
    if include_members:
        result = await db.execute(
            select(FamilyMember, User)
            .join(User, FamilyMember.user_id == User.id)
            .where(FamilyMember.family_id == family.id)
        )
        for row in result:
            member, user = row
            members.append(
                FamilyMemberResponse(
                    id=member.id,
                    user_id=member.user_id,
                    email=user.email,
                    role=member.role,
                    joined_at=member.joined_at,
                )
            )

    return FamilyResponse(
        id=family.id,
        name=family.name,
        invite_code=family.invite_code,
        created_by=family.created_by,
        member_count=len(members),
        members=members,
        created_at=family.created_at,
        updated_at=family.updated_at,
    )


@router.post("", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
async def create_family(
    data: FamilyCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a new family. The creator becomes the owner."""
    # Create the family
    family = Family(
        name=data.name,
        created_by=current_user.id,
    )
    db.add(family)
    await db.flush()

    # Add creator as owner
    member = FamilyMember(
        family_id=family.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)

    await db.commit()
    await db.refresh(family)

    return await family_to_response(family, db)


@router.get("", response_model=FamilyListResponse)
async def list_families(
    current_user: CurrentUser,
    db: DbSession,
):
    """List all families the user belongs to."""
    result = await db.execute(
        select(Family)
        .join(FamilyMember, Family.id == FamilyMember.family_id)
        .where(FamilyMember.user_id == current_user.id)
        .order_by(Family.name)
    )
    families = result.scalars().all()

    family_responses = []
    for family in families:
        family_responses.append(await family_to_response(family, db))

    return FamilyListResponse(families=family_responses)


@router.get("/{family_id}", response_model=FamilyResponse)
async def get_family(
    family_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a specific family (must be a member)."""
    # Check membership
    member_result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    result = await db.execute(select(Family).where(Family.id == family_id))
    family = result.scalar_one_or_none()

    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    return await family_to_response(family, db)


@router.put("/{family_id}", response_model=FamilyResponse)
async def update_family(
    family_id: UUID,
    data: FamilyUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a family (owner/admin only)."""
    # Check if user is owner or admin
    member_result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
            FamilyMember.role.in_(["owner", "admin"]),
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can update the family",
        )

    result = await db.execute(select(Family).where(Family.id == family_id))
    family = result.scalar_one_or_none()

    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    if data.name:
        family.name = data.name

    await db.commit()
    await db.refresh(family)

    return await family_to_response(family, db)


@router.delete("/{family_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_family(
    family_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a family (owner only)."""
    # Check if user is owner
    member_result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
            FamilyMember.role == "owner",
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can delete the family",
        )

    result = await db.execute(select(Family).where(Family.id == family_id))
    family = result.scalar_one_or_none()

    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    await db.delete(family)
    await db.commit()


@router.post("/{family_id}/regenerate-code", response_model=FamilyResponse)
async def regenerate_invite_code(
    family_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Regenerate the invite code (owner/admin only)."""
    # Check if user is owner or admin
    member_result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
            FamilyMember.role.in_(["owner", "admin"]),
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can regenerate the invite code",
        )

    result = await db.execute(select(Family).where(Family.id == family_id))
    family = result.scalar_one_or_none()

    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    family.invite_code = generate_invite_code()
    await db.commit()
    await db.refresh(family)

    return await family_to_response(family, db)


@router.post("/join/{invite_code}", response_model=JoinFamilyResponse)
async def join_family(
    invite_code: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Join a family using an invite code."""
    result = await db.execute(
        select(Family).where(Family.invite_code == invite_code)
    )
    family = result.scalar_one_or_none()

    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code",
        )

    # Check if already a member
    existing = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family.id,
            FamilyMember.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this family",
        )

    # Add as member
    member = FamilyMember(
        family_id=family.id,
        user_id=current_user.id,
        role="member",
    )
    db.add(member)
    await db.commit()

    return JoinFamilyResponse(
        family=await family_to_response(family, db),
        message="Successfully joined the family!",
    )


@router.post("/{family_id}/invite", response_model=FamilyInviteResponse)
async def invite_to_family(
    family_id: UUID,
    data: FamilyInviteCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Send an email invite to join the family."""
    # Check membership
    member_result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a family member to send invites",
        )

    result = await db.execute(select(Family).where(Family.id == family_id))
    family = result.scalar_one_or_none()

    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    # Check if user with this email already in family
    existing_user = await db.execute(
        select(User).where(User.email == data.email)
    )
    user = existing_user.scalar_one_or_none()

    if user:
        existing_member = await db.execute(
            select(FamilyMember).where(
                FamilyMember.family_id == family_id,
                FamilyMember.user_id == user.id,
            )
        )
        if existing_member.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This user is already a member of the family",
            )

    # Check for existing pending invite
    existing_invite = await db.execute(
        select(FamilyInvite).where(
            FamilyInvite.family_id == family_id,
            FamilyInvite.email == data.email,
            FamilyInvite.status == "pending",
        )
    )
    if existing_invite.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An invite has already been sent to this email",
        )

    # Create invite
    invite = FamilyInvite(
        family_id=family_id,
        email=data.email,
        invited_by=current_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    return FamilyInviteResponse(
        id=invite.id,
        family_id=family_id,
        family_name=family.name,
        email=invite.email,
        invited_by=current_user.id,
        inviter_email=current_user.email,
        status=invite.status,
        created_at=invite.created_at,
        expires_at=invite.expires_at,
    )


@router.get("/invites/pending", response_model=PendingInvitesResponse)
async def get_pending_invites(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get pending invites for the current user's email."""
    result = await db.execute(
        select(FamilyInvite, Family, User)
        .join(Family, FamilyInvite.family_id == Family.id)
        .join(User, FamilyInvite.invited_by == User.id)
        .where(
            FamilyInvite.email == current_user.email,
            FamilyInvite.status == "pending",
        )
    )

    invites = []
    for row in result:
        invite, family, inviter = row
        invites.append(
            FamilyInviteResponse(
                id=invite.id,
                family_id=invite.family_id,
                family_name=family.name,
                email=invite.email,
                invited_by=invite.invited_by,
                inviter_email=inviter.email,
                status=invite.status,
                created_at=invite.created_at,
                expires_at=invite.expires_at,
            )
        )

    return PendingInvitesResponse(invites=invites)


@router.post("/invites/{invite_id}/accept", response_model=JoinFamilyResponse)
async def accept_invite(
    invite_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Accept a family invite."""
    result = await db.execute(
        select(FamilyInvite, Family)
        .join(Family, FamilyInvite.family_id == Family.id)
        .where(
            FamilyInvite.id == invite_id,
            FamilyInvite.email == current_user.email,
            FamilyInvite.status == "pending",
        )
    )
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found",
        )

    invite, family = row

    # Check if expired
    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        invite.status = "expired"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite has expired",
        )

    # Add as member
    member = FamilyMember(
        family_id=family.id,
        user_id=current_user.id,
        role="member",
    )
    db.add(member)

    invite.status = "accepted"
    await db.commit()

    return JoinFamilyResponse(
        family=await family_to_response(family, db),
        message="Successfully joined the family!",
    )


@router.post("/invites/{invite_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
async def decline_invite(
    invite_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Decline a family invite."""
    result = await db.execute(
        select(FamilyInvite).where(
            FamilyInvite.id == invite_id,
            FamilyInvite.email == current_user.email,
            FamilyInvite.status == "pending",
        )
    )
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found",
        )

    invite.status = "declined"
    await db.commit()


@router.delete("/{family_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    family_id: UUID,
    user_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Remove a member from the family (owner/admin only, or self)."""
    # Get current user's membership
    current_member = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
        )
    )
    current_membership = current_member.scalar_one_or_none()

    if not current_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    # Get target member
    target_member = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == user_id,
        )
    )
    target_membership = target_member.scalar_one_or_none()

    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Can remove self, or owner/admin can remove others (but not owner)
    is_self = user_id == current_user.id
    can_remove_others = current_membership.role in ["owner", "admin"]

    if not is_self and not can_remove_others:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to remove this member",
        )

    # Can't remove the owner (must delete family instead)
    if target_membership.role == "owner" and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove the owner. Delete the family instead.",
        )

    # If owner leaves, delete the whole family
    if target_membership.role == "owner" and is_self:
        family_result = await db.execute(select(Family).where(Family.id == family_id))
        family = family_result.scalar_one()
        await db.delete(family)
        await db.commit()
        return

    await db.delete(target_membership)
    await db.commit()


@router.patch("/{family_id}/members/{user_id}/role")
async def update_member_role(
    family_id: UUID,
    user_id: UUID,
    role: str = Query(..., pattern="^(admin|member)$"),
    current_user: CurrentUser = None,
    db: DbSession = None,
):
    """Update a member's role (owner only)."""
    # Check if current user is owner
    owner_check = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
            FamilyMember.role == "owner",
        )
    )
    if not owner_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can change member roles",
        )

    # Get target member
    target_result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == user_id,
        )
    )
    target_member = target_result.scalar_one_or_none()

    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    if target_member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change the owner's role",
        )

    target_member.role = role
    await db.commit()

    return {"role": role}


# Content sharing endpoints

@router.post("/{family_id}/share/recipe/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def share_recipe_to_family(
    family_id: UUID,
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Share a recipe with a family."""
    # Verify membership
    member = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a family member to share",
        )

    # Verify recipe ownership
    recipe_result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = recipe_result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    recipe.family_id = family_id
    await db.commit()


@router.delete("/{family_id}/share/recipe/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unshare_recipe_from_family(
    family_id: UUID,
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Remove a recipe from family sharing."""
    # Verify recipe ownership
    recipe_result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
            Recipe.family_id == family_id,
        )
    )
    recipe = recipe_result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    recipe.family_id = None
    await db.commit()


@router.post("/{family_id}/share/shopping-list/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def share_shopping_list_to_family(
    family_id: UUID,
    list_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Share a shopping list with a family."""
    # Verify membership
    member = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a family member to share",
        )

    # Verify shopping list ownership
    list_result = await db.execute(
        select(ShoppingList).where(
            ShoppingList.id == list_id,
            ShoppingList.user_id == current_user.id,
        )
    )
    shopping_list = list_result.scalar_one_or_none()

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found",
        )

    shopping_list.family_id = family_id
    await db.commit()


@router.delete("/{family_id}/share/shopping-list/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unshare_shopping_list_from_family(
    family_id: UUID,
    list_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Remove a shopping list from family sharing."""
    # Verify shopping list ownership
    list_result = await db.execute(
        select(ShoppingList).where(
            ShoppingList.id == list_id,
            ShoppingList.user_id == current_user.id,
            ShoppingList.family_id == family_id,
        )
    )
    shopping_list = list_result.scalar_one_or_none()

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found",
        )

    shopping_list.family_id = None
    await db.commit()


@router.post("/{family_id}/share/meal-plan/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def share_meal_plan_to_family(
    family_id: UUID,
    plan_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Share a meal plan with a family."""
    # Verify membership
    member = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == current_user.id,
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a family member to share",
        )

    # Verify meal plan ownership
    plan_result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.user_id == current_user.id,
        )
    )
    meal_plan = plan_result.scalar_one_or_none()

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    meal_plan.family_id = family_id
    await db.commit()


@router.delete("/{family_id}/share/meal-plan/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unshare_meal_plan_from_family(
    family_id: UUID,
    plan_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Remove a meal plan from family sharing."""
    # Verify meal plan ownership
    plan_result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.user_id == current_user.id,
            MealPlan.family_id == family_id,
        )
    )
    meal_plan = plan_result.scalar_one_or_none()

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    meal_plan.family_id = None
    await db.commit()
