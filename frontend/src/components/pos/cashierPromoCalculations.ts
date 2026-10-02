import { Schedule } from "@/services/studioApi";
import { Promotion } from "@/services/promotionApi";

export function filterTodayTomorrowSchedules(schedules: Schedule[] | undefined) {
  if (!schedules) {
    return { todaySchedules: [], tomorrowSchedules: [] };
  }

  const now = new Date();
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayString = formatYMD(now);
  const tomorrowObj = new Date(now);
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowString = formatYMD(tomorrowObj);

  const getScheduleYMD = (sched: Schedule) => {
    const d = new Date(sched.businessDate || sched.startTime);
    return formatYMD(d);
  };

  const todayList: Schedule[] = [];
  const tomorrowList: Schedule[] = [];

  for (const s of schedules) {
    const sYMD = getScheduleYMD(s);
    if (sYMD === todayString) {
      todayList.push(s);
    } else if (sYMD === tomorrowString) {
      tomorrowList.push(s);
    }
  }

  todayList.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  tomorrowList.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return { todaySchedules: todayList, tomorrowSchedules: tomorrowList };
}

export function calculatePromoDiscount({
  selectedPromo,
  quantity,
  ticketPrice,
  subtotal,
}: {
  selectedPromo: Promotion | null;
  quantity: number;
  ticketPrice: number;
  subtotal: number;
}) {
  if (!selectedPromo || quantity === 0 || ticketPrice === 0) {
    return { promoDiscount: 0, freeTicketsCount: 0, totalAmount: subtotal };
  }

  if (quantity < selectedPromo.minTickets) {
    return { promoDiscount: 0, freeTicketsCount: 0, totalAmount: subtotal };
  }

  const remainingQuota = Math.max(0, selectedPromo.quota - selectedPromo.usedQuota);
  if (remainingQuota <= 0) {
    return { promoDiscount: 0, freeTicketsCount: 0, totalAmount: subtotal };
  }

  if (selectedPromo.promoType === "BUY_X_GET_Y") {
    const buyQty = selectedPromo.buyQty || 1;
    const getQty = selectedPromo.getQty || 1;
    const bundleSize = buyQty + getQty;
    const bundles = Math.floor(quantity / bundleSize);
    let free = bundles * getQty;
    if (selectedPromo.maxUsagePerOrder && free > selectedPromo.maxUsagePerOrder) {
      free = selectedPromo.maxUsagePerOrder;
    }
    const actualFree = Math.min(free, remainingQuota);
    const discount = actualFree * ticketPrice;
    return {
      promoDiscount: discount,
      freeTicketsCount: actualFree,
      totalAmount: Math.max(0, subtotal - discount),
    };
  } else if (selectedPromo.promoType === "PERCENTAGE") {
    const percent = selectedPromo.discountPercent || 0;
    let eligibleTickets = Math.min(quantity, remainingQuota);
    if (selectedPromo.maxUsagePerOrder && eligibleTickets > selectedPromo.maxUsagePerOrder) {
      eligibleTickets = selectedPromo.maxUsagePerOrder;
    }
    let rawDiscount = eligibleTickets * ticketPrice * (percent / 100);
    if (selectedPromo.maxDiscount && rawDiscount > selectedPromo.maxDiscount) {
      rawDiscount = selectedPromo.maxDiscount;
    }
    return {
      promoDiscount: rawDiscount,
      freeTicketsCount: 0,
      totalAmount: Math.max(0, subtotal - rawDiscount),
    };
  }

  return { promoDiscount: 0, freeTicketsCount: 0, totalAmount: subtotal };
}
