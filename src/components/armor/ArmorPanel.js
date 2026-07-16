import React from "react";
import { Box, Button, LinearProgress, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { equipArmor, unequipArmor } from "../../features/world/worldSlice";
import { ARMOR_SLOTS, getArmorDefense } from "../../game/config/armor";
import { ITEM_TYPES, getItemDefinition } from "../../game/config/blockTypes";
import { ARMOR_SET_BONUSES, getArmorSetBonus } from "../../game/config/armorSets";
import InventorySlot from "../inventory/slots/InventorySlot";
import ArmorMannequinCanvas from "../character/model/ArmorMannequinCanvas";

const SLOT_LABELS = {
  helmet: "Helmet",
  chestplate: "Chest",
  leggings: "Legs",
  boots: "Boots",
};

function ArmorSlotNode({ slot, itemId, durability, onUnequip }) {
  return (
    <div className={`armor-node armor-node-${slot}`}>
      <span className="armor-node-label">{SLOT_LABELS[slot]}</span>
      <InventorySlot
        itemId={itemId}
        count={itemId ? 1 : 0}
        durability={itemId ? durability : null}
        emptyLabel={`${SLOT_LABELS[slot]} slot`}
        onClick={itemId ? onUnequip : undefined}
      />
    </div>
  );
}

export default function ArmorPanel() {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.world.inventory);
  const armor = useSelector((state) => state.world.armor);
  const armorDurability = useSelector((state) => state.world.armorDurability);
  const defense = getArmorDefense(armor, ITEM_TYPES);
  const setBonus = getArmorSetBonus(armor, ITEM_TYPES);
  const ownedArmor = Object.entries(inventory)
    .filter(([itemId, count]) => count > 0 && ITEM_TYPES[itemId]?.category === "armor")
    .map(([itemId]) => itemId)
    .sort((a, b) => {
      const first = getItemDefinition(a);
      const second = getItemDefinition(b);
      return `${first.materialId}-${first.armorSlot}`.localeCompare(`${second.materialId}-${second.armorSlot}`);
    });

  return (
    <Box className="character-screen">
      <div className="rpg-section-heading">
        <div>
          <Typography variant="h5" fontWeight={1000}>Armory</Typography>
          <Typography color="text.secondary" variant="body2">
            Rotate through your equipment visually. Select a glowing slot to unequip it, or choose owned armor below to equip it.
          </Typography>
        </div>
        <div className="defense-medallion">
          <span>{defense}</span>
          <small>DEFENSE</small>
        </div>
      </div>

      <div className="armor-stage">
        <ArmorMannequinCanvas />
        {ARMOR_SLOTS.map((slot) => (
          <ArmorSlotNode
            key={slot}
            slot={slot}
            itemId={armor[slot]}
            durability={armor[slot] ? armorDurability[armor[slot]] : null}
            onUnequip={() => dispatch(unequipArmor(slot))}
          />
        ))}
        <div className="armor-stage-caption">
          <strong>{setBonus ? setBonus.name : "No full-set resonance"}</strong>
          <span>{setBonus ? setBonus.description : `Equip four matching pieces to awaken one of ${Object.keys(ARMOR_SET_BONUSES).length} material set bonuses.`}</span>
        </div>
      </div>

      <div className="armor-defense-track">
        <div>
          <span>Total protection</span>
          <strong>{Math.round(Math.min(100, defense / 21 * 100))}%</strong>
        </div>
        <LinearProgress variant="determinate" value={Math.min(100, defense / 21 * 100)} />
      </div>

      <Typography fontWeight={1000} sx={{ mt: 2.4, mb: 1 }}>Owned armor</Typography>
      {ownedArmor.length ? (
        <div className="armor-owned-grid">
          {ownedArmor.map((itemId) => {
            const definition = getItemDefinition(itemId);
            const equipped = armor[definition.armorSlot] === itemId;
            const maxDurability = definition.durability || 1;
            const currentDurability = armorDurability[itemId] ?? maxDurability;
            return (
              <article key={itemId} className={`armor-card armor-${definition.materialId || "basic"} ${equipped ? "is-equipped" : ""}`}>
                <div className="armor-card-icon">
                  <InventorySlot itemId={itemId} count={1} durability={currentDurability} compact />
                </div>
                <div className="armor-card-copy">
                  <Typography fontWeight={1000}>{definition.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {definition.defense} defense · {SLOT_LABELS[definition.armorSlot]} · {currentDurability}/{maxDurability} durability
                  </Typography>
                </div>
                <Button
                  variant={equipped ? "outlined" : "contained"}
                  disabled={equipped}
                  onClick={() => dispatch(equipArmor(itemId))}
                >
                  {equipped ? "Equipped" : "Equip"}
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rpg-empty-state">Craft armor at a placed crafting table to populate this armory.</div>
      )}
    </Box>
  );
}
