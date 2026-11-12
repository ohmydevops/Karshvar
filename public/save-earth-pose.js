export function astronautPose(player, time) {
  const roll = Math.sin(time * 0.65) * 0.025;
  const body = {
    x: player.x + Math.sin(time * 0.7) * 1.5,
    y: player.y + Math.sin(time * 0.95) * 2,
  };
  const handX = 23,
    handY = -16;
  const grip = {
    x: body.x + handX * Math.cos(roll) + handY * Math.sin(roll),
    y: body.y - handX * Math.sin(roll) + handY * Math.cos(roll),
  };
  return { body, grip, roll };
}
